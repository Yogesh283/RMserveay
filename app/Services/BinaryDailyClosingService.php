<?php

namespace App\Services;

use App\Models\BinaryDailyClosing;
use App\Models\MatchingPayout;
use App\Models\User;
use App\Models\WalletTransaction;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Binary 1:1 daily closing.
 *
 *  Rule 1: 1 Left + 1 Right = 1 Pair.
 *  Rule 2: Both legs must have at least 1 point to form a pair.
 *  Rule 3: Closing time defaults to 00:00 IST (configurable in `binary_closing.php`).
 *  Rule 4–5: Capped at `max_pairs_per_day` (default 20).
 *  Rule 6: Matched pairs deducted from BOTH legs.
 *  Rule 7: Higher leg's leftover carries forward.
 *  Rule 8: Lower leg's leftover lapses to 0.
 *  Rule 9: Wallet auto-credited per closing (one transaction per user × scope).
 *  Rule 10: Every closing produces a `BinaryDailyClosing` audit row.
 *  Rule 11: Driven by the `binary:daily-closing` artisan command (cron-scheduled).
 *  Rule 12: Pair income / daily cap configurable per scope.
 */
class BinaryDailyClosingService
{
    public function __construct(
        protected SubPanelMatchingService $subPanelMatching,
        protected SuperSubPanelMatchingService $superSubPanelMatching,
    ) {}

    /**
     * Run the closing for every user that has any non-zero carry, across every enabled scope.
     *
     * @return array{
     *     processed: int,
     *     paid_users: int,
     *     pairs_matched: int,
     *     payout_usd: string,
     *     scopes: array<string, array{processed:int,paid_users:int,pairs_matched:int,payout_usd:string}>,
     *     closing_date: string,
     * }
     */
    public function closeAll(?CarbonInterface $closingDate = null, ?array $only = null): array
    {
        $tz = $this->timezone();
        $date = $this->resolveClosingDate($closingDate);

        $totals = [
            'processed' => 0,
            'paid_users' => 0,
            'pairs_matched' => 0,
            'payout_usd' => '0.00',
            'scopes' => [],
            'closing_date' => $date->toDateString(),
        ];

        $filter = $only !== null ? array_flip(array_map('strval', $only)) : null;

        foreach ($this->enabledScopes() as $scope => $cfg) {
            if ($filter !== null && ! isset($filter[$scope])) {
                continue;
            }
            $scopeTotals = $this->closeScope($scope, $cfg, $date);

            $totals['processed'] += $scopeTotals['processed'];
            $totals['paid_users'] += $scopeTotals['paid_users'];
            $totals['pairs_matched'] += $scopeTotals['pairs_matched'];
            $totals['payout_usd'] = bcadd($totals['payout_usd'], $scopeTotals['payout_usd'], 2);
            $totals['scopes'][$scope] = $scopeTotals;
        }

        return $totals;
    }

    /**
     * Run the closing for a single user × scope and return the audit row (or null if nothing to do).
     */
    public function closeForUser(User $user, string $scope, ?CarbonInterface $closingDate = null): ?BinaryDailyClosing
    {
        $cfg = $this->scopeConfig($scope);
        if ($cfg === null) {
            return null;
        }

        $date = $this->resolveClosingDate($closingDate);

        return $this->processOne($user->id, $scope, $cfg, $date);
    }

    /**
     * Resolve / normalize the closing date into the configured timezone, at start-of-day.
     */
    private function resolveClosingDate(?CarbonInterface $closingDate): CarbonImmutable
    {
        $tz = $this->timezone();
        if ($closingDate === null) {
            return CarbonImmutable::now($tz)->subDay()->startOfDay();
        }

        return CarbonImmutable::instance($closingDate)->setTimezone($tz)->startOfDay();
    }

    /**
     * @return array{processed:int,paid_users:int,pairs_matched:int,payout_usd:string}
     */
    private function closeScope(string $scope, array $cfg, CarbonImmutable $date): array
    {
        $leftCol = $cfg['left_column'];
        $rightCol = $cfg['right_column'];

        $totals = [
            'processed' => 0,
            'paid_users' => 0,
            'pairs_matched' => 0,
            'payout_usd' => '0.00',
        ];

        User::query()
            ->where(function ($q) use ($leftCol, $rightCol) {
                $q->where($leftCol, '>', 0)->orWhere($rightCol, '>', 0);
            })
            ->orderBy('id')
            ->select(['id'])
            ->chunkById(500, function ($chunk) use (&$totals, $scope, $cfg, $date) {
                foreach ($chunk as $row) {
                    try {
                        $closing = $this->processOne((int) $row->id, $scope, $cfg, $date);
                    } catch (Throwable $e) {
                        Log::error('binary_closing.user_failed', [
                            'user_id' => (int) $row->id,
                            'scope' => $scope,
                            'closing_date' => $date->toDateString(),
                            'error' => $e->getMessage(),
                        ]);

                        continue;
                    }

                    if ($closing === null) {
                        continue;
                    }

                    $totals['processed']++;
                    $totals['pairs_matched'] += (int) $closing->pairs_matched;
                    $totals['payout_usd'] = bcadd($totals['payout_usd'], (string) $closing->payout_usd, 2);

                    if ((int) $closing->pairs_matched > 0) {
                        $totals['paid_users']++;
                    }
                }
            });

        return $totals;
    }

    /**
     * Atomically close one (user, scope, date).
     *
     * Testing requirement: same date can be closed multiple times. Each run
     * consumes the user's current carry and records a fresh audit row.
     */
    private function processOne(int $userId, string $scope, array $cfg, CarbonImmutable $date): ?BinaryDailyClosing
    {
        $leftCol = $cfg['left_column'];
        $rightCol = $cfg['right_column'];
        $perPair = $this->normalizeUsd((string) $cfg['pair_income_usd']);
        $maxPairs = max(0, (int) $cfg['max_pairs_per_day']);
        $txType = (string) $cfg['wallet_tx_type'];
        $strategy = (string) ($cfg['lapse_strategy'] ?? 'no_lapse_both_carry');

        return DB::transaction(function () use ($userId, $scope, $leftCol, $rightCol, $perPair, $maxPairs, $txType, $strategy, $date) {
            /** @var User|null $user */
            $user = User::query()->whereKey($userId)->lockForUpdate()->first();
            if ($user === null) {
                return null;
            }

            $leftIn = (int) $user->{$leftCol};
            $rightIn = (int) $user->{$rightCol};

            if ($leftIn <= 0 && $rightIn <= 0) {
                return null;
            }

            // Eligibility-skip for sub / super scopes.
            // If the earner has not qualified for this scope (e.g. sub_panel_count
            // < required for panel, super_sub_panel_count < required for super),
            // SKIP the closing entirely — do NOT consume carries, do NOT lapse,
            // do NOT create an audit row. Their carries stay intact until they
            // qualify; once they do, the next closing will pay on the full carry.
            // Active-panel scope has no such gate (it pays $1/pair to anyone with
            // a carry), so this only applies to milestone-driven scopes.
            if ($scope === BinaryDailyClosing::SCOPE_PANEL
                && ! $user->qualifiesForPanelMatchingIncome()) {
                return null;
            }
            if ($scope === BinaryDailyClosing::SCOPE_SUPER
                && ! $user->qualifiesForSuperSubPanelMatchingIncome()) {
                return null;
            }

            $pairsAvailable = min($leftIn, $rightIn);
            $pairsMatched = min($pairsAvailable, $maxPairs);
            $capHit = $pairsAvailable > $maxPairs;

            $payout = bcmul((string) $pairsMatched, $perPair, 2);

            // Carry / lapse split — strategy-driven so different scopes can
            // follow their own MLM rule. See config/binary_closing.php for
            // the per-scope `lapse_strategy` value.
            if ($strategy === 'weak_lapse_strong_diff') {
                // Classical binary MLM (Active Panel rule):
                //   - weak leg fully consumed (any leftover LAPSES);
                //   - strong leg carries only the diff = strong - weak;
                //   - cap-induced surplus on strong (when weak > max_pairs)
                //     also LAPSES — only the "diff" part carries.
                $diff = abs($leftIn - $rightIn);
                if ($leftIn >= $rightIn) {
                    $leftOut = $diff;
                    $rightOut = 0;
                } else {
                    $leftOut = 0;
                    $rightOut = $diff;
                }
                $leftLapsed = max(0, $leftIn - $pairsMatched - $leftOut);
                $rightLapsed = max(0, $rightIn - $pairsMatched - $rightOut);
            } else {
                // 'no_lapse_both_carry' (Sub / Super rule): any unmatched
                // pairs on EITHER side roll forward; the milestone-side
                // lapse is handled inside Sub/SuperSubPanelMatchingService.
                $leftOut = $leftIn - $pairsMatched;
                $rightOut = $rightIn - $pairsMatched;
                $leftLapsed = 0;
                $rightLapsed = 0;
            }

            $walletTxId = null;
            $balanceAfter = (string) $user->wallet_balance;

            // Per-pair stream — only paid when scope has a non-zero pair_income.
            // Sub-panel and super-sub-panel scopes set pair_income_usd to "0.00"
            // so they pay only the tier-based milestone instead.
            $perPairPayout = $payout;
            if (bccomp($perPairPayout, '0.00', 2) > 0) {
                $balanceAfter = bcadd($balanceAfter, $perPairPayout, 2);
                $user->wallet_balance = $balanceAfter;

                $tx = WalletTransaction::create([
                    'user_id' => $user->id,
                    'type' => $txType,
                    'amount' => $perPairPayout,
                    'balance_after' => $balanceAfter,
                    'meta' => [
                        'source' => 'binary_daily_closing',
                        'scope' => $scope,
                        'pairs' => $pairsMatched,
                        'per_pair_usd' => $perPair,
                        'closing_date' => $date->toDateString(),
                        'cap_hit' => $capHit,
                    ],
                ]);

                $walletTxId = $tx->id;
            }

            $user->{$leftCol} = $leftOut;
            $user->{$rightCol} = $rightOut;
            $user->save();

            // Tier-based milestone payout for sub-panel and super-sub-panel scopes.
            // applyMatchedPairs() pays the highest milestone reached by today's
            // matched pairs only — excess pairs above the milestone LAPSE
            // (counter does NOT carry across days). Mutates the in-memory user;
            // we save after the call.
            $milestonePaidUsd = '0.00';
            $milestoneMeta = [];
            if ($pairsMatched > 0) {
                if ($scope === BinaryDailyClosing::SCOPE_PANEL) {
                    $r = $this->subPanelMatching->applyMatchedPairs($user, $pairsMatched);
                    $milestonePaidUsd = (string) $r['payout_usd'];
                    $milestoneMeta = $r;
                } elseif ($scope === BinaryDailyClosing::SCOPE_SUPER) {
                    $r = $this->superSubPanelMatching->applyMatchedPairs($user, $pairsMatched);
                    $milestonePaidUsd = (string) $r['payout_usd'];
                    $milestoneMeta = $r;
                }
                $user->save();
                $balanceAfter = (string) $user->wallet_balance;
            }

            $totalPayout = bcadd($payout, $milestonePaidUsd, 2);

            $closing = BinaryDailyClosing::create([
                'user_id' => $user->id,
                'closing_date' => $date->toDateString(),
                'scope' => $scope,
                'left_carry_in' => $leftIn,
                'right_carry_in' => $rightIn,
                'pairs_matched' => $pairsMatched,
                'cap_hit' => $capHit,
                'per_pair_usd' => $perPair,
                'payout_usd' => $totalPayout,
                'balance_after_usd' => $balanceAfter,
                'left_carry_out' => $leftOut,
                'right_carry_out' => $rightOut,
                'left_lapsed' => $leftLapsed,
                'right_lapsed' => $rightLapsed,
                'wallet_transaction_id' => $walletTxId,
                'meta' => [
                    'pairs_available' => $pairsAvailable,
                    'max_pairs_per_day' => $maxPairs,
                    'timezone' => $this->timezone(),
                    'per_pair_paid_usd' => $payout,
                    'milestone_paid_usd' => $milestonePaidUsd,
                    'milestone' => $milestoneMeta['milestone'] ?? null,
                    'milestone_pairs_today' => $milestoneMeta['pairs_today'] ?? null,
                    'milestone_lapsed_pairs' => $milestoneMeta['lapsed_pairs'] ?? null,
                ],
            ]);

            // Paid-users-only ledger: only insert when this closing actually
            // moved money. Idempotent via the (user_id, scope, closing_date)
            // unique index — same-day re-runs hit the existing row.
            if (bccomp((string) $totalPayout, '0.00', 2) > 0) {
                // For sub / super scopes the milestone wallet_transaction is
                // created INSIDE applyMatchedPairs (we don't have its id here).
                // Pick it up from the wallet log so the payout row links back.
                $linkedTxId = $walletTxId;
                if ($linkedTxId === null && bccomp($milestonePaidUsd, '0.00', 2) > 0) {
                    $linkedTxId = WalletTransaction::query()
                        ->where('user_id', $user->id)
                        ->where('type', $txType)
                        ->latest('id')
                        ->value('id');
                }

                MatchingPayout::query()->create([
                    'user_id' => $user->id,
                    'scope' => $scope,
                    'closing_date' => $date->toDateString(),
                    'pairs_matched' => $pairsMatched,
                    'milestone' => $milestoneMeta['milestone'] ?? null,
                    'lapsed_pairs' => (int) ($milestoneMeta['lapsed_pairs'] ?? ($leftLapsed + $rightLapsed)),
                    'payout_usd' => $totalPayout,
                    'balance_after_usd' => $balanceAfter,
                    'binary_daily_closing_id' => $closing->id,
                    'wallet_transaction_id' => $linkedTxId,
                    'meta' => [
                        'per_pair_paid_usd' => $payout,
                        'milestone_paid_usd' => $milestonePaidUsd,
                        'cap_hit' => $capHit,
                    ],
                ]);
            }

            return $closing;
        });
    }

    /**
     * @return array<string, array{enabled:bool,left_column:string,right_column:string,wallet_tx_type:string,pair_income_usd:string,max_pairs_per_day:int}>
     */
    public function enabledScopes(): array
    {
        $out = [];
        foreach ((array) config('binary_closing.scopes', []) as $key => $cfg) {
            if (! is_array($cfg)) {
                continue;
            }
            if (! ($cfg['enabled'] ?? false)) {
                continue;
            }
            $out[(string) $key] = $cfg;
        }

        return $out;
    }

    public function scopeConfig(string $scope): ?array
    {
        $all = (array) config('binary_closing.scopes', []);

        return isset($all[$scope]) && is_array($all[$scope]) ? $all[$scope] : null;
    }

    public function timezone(): string
    {
        return (string) config('binary_closing.timezone', 'Asia/Kolkata');
    }

    /** "HH:MM" in the configured timezone. */
    public function closingTime(): string
    {
        return (string) config('binary_closing.closing_time', '00:00');
    }

    public function isEnabled(): bool
    {
        return (bool) config('binary_closing.enabled', true);
    }

    private function normalizeUsd(string $raw): string
    {
        $clean = preg_replace('/[^\d.\-]/', '', $raw) ?? '0';
        if ($clean === '' || $clean === '-' || $clean === '.') {
            $clean = '0';
        }

        return number_format((float) $clean, 2, '.', '');
    }
}

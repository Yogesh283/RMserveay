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
        protected PanelMatchingService $panelMatching,
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

                    if (bccomp((string) $closing->payout_usd, '0.00', 2) > 0) {
                        $totals['paid_users']++;
                    }
                }
            });

        return $totals;
    }

    /**
     * Atomically close one (user, scope, date).
     *
     * First paid run for this closing_date distributes income and consumes carry.
     * Later cron/admin re-runs for the same date refresh structure audit only
     * (no wallet credit, carry columns on the user are left unchanged).
     */
    private function processOne(int $userId, string $scope, array $cfg, CarbonImmutable $date): ?BinaryDailyClosing
    {
        $leftCol = $cfg['left_column'];
        $rightCol = $cfg['right_column'];
        $perPair = $this->normalizeUsd((string) $cfg['pair_income_usd']);
        $maxPairs = max(0, (int) $cfg['max_pairs_per_day']);
        $txType = (string) $cfg['wallet_tx_type'];
        $strategy = (string) ($cfg['lapse_strategy'] ?? 'no_lapse_both_carry');
        $closingDate = $date->toDateString();

        return DB::transaction(function () use ($userId, $scope, $leftCol, $rightCol, $perPair, $maxPairs, $txType, $strategy, $closingDate) {
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

            if ($scope === BinaryDailyClosing::SCOPE_PANEL
                && ! $user->qualifiesForPanelMatchingIncome()) {
                return null;
            }
            if ($scope === BinaryDailyClosing::SCOPE_SUPER
                && ! $user->qualifiesForSuperSubPanelMatchingIncome()) {
                return null;
            }

            $split = $this->computeCarrySplit($leftIn, $rightIn, $maxPairs, $strategy);

            $existingPaid = BinaryDailyClosing::firstPaidForClosingDate($userId, $scope, $closingDate);
            if ($existingPaid !== null) {
                return $this->recordStructureOnlyClosing(
                    $user,
                    $scope,
                    $closingDate,
                    $perPair,
                    $leftIn,
                    $rightIn,
                    $split,
                    $existingPaid,
                );
            }

            return $this->recordPaidClosing(
                $user,
                $scope,
                $closingDate,
                $leftCol,
                $rightCol,
                $perPair,
                $txType,
                $split,
            );
        });
    }

    /**
     * @return array{
     *     pairs_available:int,
     *     pairs_matched:int,
     *     cap_hit:bool,
     *     payout:string,
     *     left_out:int,
     *     right_out:int,
     *     left_lapsed:int,
     *     right_lapsed:int
     * }
     */
    private function computeCarrySplit(int $leftIn, int $rightIn, int $maxPairs, string $strategy): array
    {
        $pairsAvailable = min($leftIn, $rightIn);
        $pairsMatched = min($pairsAvailable, $maxPairs);
        $capHit = $pairsAvailable > $maxPairs;

        if ($strategy === 'weak_lapse_strong_diff') {
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
            $leftOut = $leftIn - $pairsMatched;
            $rightOut = $rightIn - $pairsMatched;
            $leftLapsed = 0;
            $rightLapsed = 0;
        }

        return [
            'pairs_available' => $pairsAvailable,
            'pairs_matched' => $pairsMatched,
            'cap_hit' => $capHit,
            'left_out' => $leftOut,
            'right_out' => $rightOut,
            'left_lapsed' => $leftLapsed,
            'right_lapsed' => $rightLapsed,
        ];
    }

    /**
     * Re-run for same closing_date after income was already paid: audit snapshot only.
     */
    private function recordStructureOnlyClosing(
        User $user,
        string $scope,
        string $closingDate,
        string $perPair,
        int $leftIn,
        int $rightIn,
        array $split,
        BinaryDailyClosing $existingPaid,
    ): BinaryDailyClosing {
        return BinaryDailyClosing::create([
            'user_id' => $user->id,
            'closing_date' => $closingDate,
            'scope' => $scope,
            'left_carry_in' => $leftIn,
            'right_carry_in' => $rightIn,
            'pairs_matched' => (int) $split['pairs_matched'],
            'cap_hit' => (bool) $split['cap_hit'],
            'per_pair_usd' => $perPair,
            'payout_usd' => '0.00',
            'balance_after_usd' => (string) $user->wallet_balance,
            'left_carry_out' => (int) $split['left_out'],
            'right_carry_out' => (int) $split['right_out'],
            'left_lapsed' => (int) $split['left_lapsed'],
            'right_lapsed' => (int) $split['right_lapsed'],
            'wallet_transaction_id' => null,
            'meta' => $this->structureOnlyMeta($split, $existingPaid),
        ]);
    }

    /**
     * First paid run: wallet credit, carry consumption, milestone payout.
     */
    private function recordPaidClosing(
        User $user,
        string $scope,
        string $closingDate,
        string $leftCol,
        string $rightCol,
        string $perPair,
        string $txType,
        array $split,
    ): BinaryDailyClosing {
        $leftIn = (int) $user->{$leftCol};
        $rightIn = (int) $user->{$rightCol};
        $pairsMatched = (int) $split['pairs_matched'];
        $payout = bcmul((string) $pairsMatched, $perPair, 2);

        $walletTxId = null;
        $balanceAfter = (string) $user->wallet_balance;

        if (bccomp($payout, '0.00', 2) > 0) {
            $balanceAfter = bcadd($balanceAfter, $payout, 2);
            $user->wallet_balance = $balanceAfter;

            $tx = WalletTransaction::create([
                'user_id' => $user->id,
                'type' => $txType,
                'amount' => $payout,
                'balance_after' => $balanceAfter,
                'meta' => [
                    'source' => 'binary_daily_closing',
                    'scope' => $scope,
                    'pairs' => $pairsMatched,
                    'per_pair_usd' => $perPair,
                    'closing_date' => $closingDate,
                    'cap_hit' => (bool) $split['cap_hit'],
                ],
            ]);

            $walletTxId = $tx->id;
        }

        $user->{$leftCol} = (int) $split['left_out'];
        $user->{$rightCol} = (int) $split['right_out'];
        $user->save();

        $milestonePaidUsd = '0.00';
        $milestoneMeta = [];
        if ($pairsMatched > 0) {
            if ($scope === BinaryDailyClosing::SCOPE_PANEL) {
                $lifetime = $this->panelMatching->lifetimeSubPanelBuys($user);
                $weakLeg = min($lifetime['left'], $lifetime['right']);
                $r = $this->subPanelMatching->applyMatchedPairs($user, $pairsMatched, $weakLeg);
                $milestonePaidUsd = (string) $r['payout_usd'];
                $milestoneMeta = $r;
            } elseif ($scope === BinaryDailyClosing::SCOPE_SUPER) {
                $lifetime = $this->superSubPanelMatching->lifetimeSuperSubPanelBuys($user);
                $weakLeg = min($lifetime['left'], $lifetime['right']);
                $r = $this->superSubPanelMatching->applyMatchedPairs($user, $pairsMatched, $weakLeg);
                $milestonePaidUsd = (string) $r['payout_usd'];
                $milestoneMeta = $r;
            }
            $user->save();
            $balanceAfter = (string) $user->wallet_balance;
        }

        $totalPayout = bcadd($payout, $milestonePaidUsd, 2);

        $closing = BinaryDailyClosing::create([
            'user_id' => $user->id,
            'closing_date' => $closingDate,
            'scope' => $scope,
            'left_carry_in' => $leftIn,
            'right_carry_in' => $rightIn,
            'pairs_matched' => $pairsMatched,
            'cap_hit' => (bool) $split['cap_hit'],
            'per_pair_usd' => $perPair,
            'payout_usd' => $totalPayout,
            'balance_after_usd' => $balanceAfter,
            'left_carry_out' => (int) $split['left_out'],
            'right_carry_out' => (int) $split['right_out'],
            'left_lapsed' => (int) $split['left_lapsed'],
            'right_lapsed' => (int) $split['right_lapsed'],
            'wallet_transaction_id' => $walletTxId,
            'meta' => [
                'pairs_available' => (int) $split['pairs_available'],
                'max_pairs_per_day' => (int) ($this->scopeConfig($scope)['max_pairs_per_day'] ?? 20),
                'timezone' => $this->timezone(),
                'per_pair_paid_usd' => $payout,
                'milestone_paid_usd' => $milestonePaidUsd,
                'milestone' => $milestoneMeta['milestone'] ?? null,
                'milestone_pairs_today' => $milestoneMeta['pairs_today'] ?? null,
                'milestone_weak_leg' => $milestoneMeta['weak_leg'] ?? null,
                'milestone_lapsed_pairs' => $milestoneMeta['lapsed_pairs'] ?? null,
            ],
        ]);

        if (bccomp($totalPayout, '0.00', 2) > 0) {
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
                'closing_date' => $closingDate,
                'pairs_matched' => $pairsMatched,
                'milestone' => $milestoneMeta['milestone'] ?? null,
                'lapsed_pairs' => (int) ($milestoneMeta['lapsed_pairs'] ?? ((int) $split['left_lapsed'] + (int) $split['right_lapsed'])),
                'payout_usd' => $totalPayout,
                'balance_after_usd' => $balanceAfter,
                'binary_daily_closing_id' => $closing->id,
                'wallet_transaction_id' => $linkedTxId,
                'meta' => [
                    'per_pair_paid_usd' => $payout,
                    'milestone_paid_usd' => $milestonePaidUsd,
                    'cap_hit' => (bool) $split['cap_hit'],
                ],
            ]);
        }

        return $closing;
    }

    /**
     * @param  array<string, mixed>  $split
     * @return array<string, mixed>
     */
    private function structureOnlyMeta(array $split, BinaryDailyClosing $existingPaid): array
    {
        $paidMeta = $existingPaid->meta ?? [];

        return [
            'structure_only_refresh' => true,
            'income_closing_id' => $existingPaid->id,
            'pairs_available' => (int) $split['pairs_available'],
            'timezone' => $this->timezone(),
            'per_pair_paid_usd' => '0.00',
            'milestone_paid_usd' => (string) ($paidMeta['milestone_paid_usd'] ?? '0.00'),
            'milestone' => $paidMeta['milestone'] ?? null,
            'milestone_pairs_today' => $paidMeta['milestone_pairs_today'] ?? null,
            'milestone_weak_leg' => $paidMeta['milestone_weak_leg'] ?? null,
            'milestone_lapsed_pairs' => $paidMeta['milestone_lapsed_pairs'] ?? null,
        ];
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

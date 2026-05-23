<?php

namespace App\Services;

use App\Models\BinaryDailyClosing;
use App\Models\MatchingPayout;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Support\BinaryClosingCalendar;
use App\Support\MatchingMilestoneTable;
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
        protected BinaryClosingDailyCarryService $dailyCarry,
        protected BinarySubtreeVolumeService $subtreeVolumes,
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
        $totals = [
            'processed' => 0,
            'paid_users' => 0,
            'pairs_matched' => 0,
            'payout_usd' => '0.00',
        ];

        $userIds = $this->userIdsToClose($scope, $cfg, $date);

        foreach (array_chunk($userIds, 500) as $chunk) {
            foreach ($chunk as $userId) {
                try {
                    $closing = $this->processOne((int) $userId, $scope, $cfg, $date);
                } catch (Throwable $e) {
                    Log::error('binary_closing.user_failed', [
                        'user_id' => (int) $userId,
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
        }

        return $totals;
    }

    /**
     * @return list<int>
     */
    private function userIdsToClose(string $scope, array $cfg, CarbonImmutable $date): array
    {
        if ($this->usesDailyCarryLedger()) {
            $leftCol = $cfg['left_column'];
            $rightCol = $cfg['right_column'];
            $ids = [];

            foreach ($this->dailyCarry->incrementsForClosingDate($scope, $date) as $userId => $sides) {
                if (((int) $sides['left']) > 0 || ((int) $sides['right']) > 0) {
                    $ids[(int) $userId] = true;
                }
            }

            // Inactive (or active) users with stored carry must still close so left/right buckets refresh.
            User::query()
                ->where(function ($q) use ($leftCol, $rightCol) {
                    $q->where($leftCol, '>', 0)->orWhere($rightCol, '>', 0);
                })
                ->orderBy('id')
                ->pluck('id')
                ->each(function ($id) use (&$ids) {
                    $ids[(int) $id] = true;
                });

            $out = array_keys($ids);
            sort($out);

            return $out;
        }

        $leftCol = $cfg['left_column'];
        $rightCol = $cfg['right_column'];

        return User::query()
            ->where(function ($q) use ($leftCol, $rightCol) {
                $q->where($leftCol, '>', 0)->orWhere($rightCol, '>', 0);
            })
            ->orderBy('id')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function usesDailyCarryLedger(): bool
    {
        if (! app()->runningUnitTests()) {
            return true;
        }

        return (bool) config('binary_closing.use_daily_carry_ledger', true);
    }

    /**
     * Atomically close one (user, scope, date).
     *
     * Same math as the team page: opening carry (previous close or lifetime) + that date's per-leg volume.
     * Re-run for the same date updates carry/matching only — wallet income is never duplicated.
     */
    private function processOne(int $userId, string $scope, array $cfg, CarbonImmutable $date): ?BinaryDailyClosing
    {
        $leftCol = $cfg['left_column'];
        $rightCol = $cfg['right_column'];
        $perPair = $this->normalizeUsd((string) $cfg['pair_income_usd']);
        $maxPairs = max(0, (int) $cfg['max_pairs_per_day']);
        $txType = (string) $cfg['wallet_tx_type'];
        $strategy = (string) ($cfg['lapse_strategy'] ?? 'no_lapse_both_carry');
        $useDailyLedger = $this->usesDailyCarryLedger();

        return DB::transaction(function () use ($userId, $scope, $leftCol, $rightCol, $perPair, $maxPairs, $txType, $strategy, $date, $useDailyLedger) {
            /** @var User|null $user */
            $user = User::query()->whereKey($userId)->lockForUpdate()->first();
            if ($user === null) {
                return null;
            }

            $storedLeft = (int) $user->{$leftCol};
            $storedRight = (int) $user->{$rightCol};

            $matchInputs = $this->subtreeVolumes->closingMatchInputs($user, $scope, $date, $maxPairs);
            $leftIn = (int) $matchInputs['left_in'];
            $rightIn = (int) $matchInputs['right_in'];
            $dailyLeft = (int) $matchInputs['yesterday_left'];
            $dailyRight = (int) $matchInputs['yesterday_right'];

            if ($leftIn <= 0 && $rightIn <= 0) {
                return null;
            }

            $incomeEligible = $user->qualifiesBinaryClosingIncome($scope);
            $incomeBlockedReason = $user->binaryClosingIncomeBlockedReason($scope);

            if (! $incomeEligible && min($leftIn, $rightIn) > 0) {
                Log::info('binary_closing.carry_only_inactive_panelist', [
                    'user_id' => $userId,
                    'scope' => $scope,
                    'closing_date' => $date->toDateString(),
                    'left_in' => $leftIn,
                    'right_in' => $rightIn,
                ]);
            }

            $closingDateStr = $date->toDateString();

            /** @var BinaryDailyClosing|null $existingClosing */
            $existingClosing = BinaryDailyClosing::query()
                ->where('user_id', $userId)
                ->where('scope', $scope)
                ->whereDate('closing_date', $closingDateStr)
                ->lockForUpdate()
                ->orderByDesc('id')
                ->first();

            $incomeAlreadyPaid = $this->closingIncomeAlreadyPaid($userId, $scope, $closingDateStr, $txType, $existingClosing);

            $pairsAvailable = min($leftIn, $rightIn);
            $capHit = false;
            $pairsMatched = 0;
            $leftOut = $leftIn;
            $rightOut = $rightIn;
            $leftLapsed = 0;
            $rightLapsed = 0;
            $payout = '0.00';

            if ($incomeEligible) {
                $pairsMatched = min($pairsAvailable, $maxPairs);
                $capHit = $pairsAvailable > $maxPairs;
                $carryLeft = $leftIn;
                $carryRight = $rightIn;

                $payout = bcmul((string) $pairsMatched, $perPair, 2);

                if ($strategy === 'weak_lapse_strong_diff') {
                    $diff = abs($carryLeft - $carryRight);
                    if ($carryLeft >= $carryRight) {
                        $leftOut = $diff;
                        $rightOut = 0;
                    } else {
                        $leftOut = 0;
                        $rightOut = $diff;
                    }
                    $leftLapsed = max(0, $carryLeft - $pairsMatched - $leftOut);
                    $rightLapsed = max(0, $carryRight - $pairsMatched - $rightOut);
                } else {
                    $leftOut = $carryLeft - $pairsMatched;
                    $rightOut = $carryRight - $pairsMatched;
                }
            } else {
                Log::info('binary_closing.pairs_held_inactive_panelist', [
                    'user_id' => $userId,
                    'scope' => $scope,
                    'closing_date' => $date->toDateString(),
                    'pairs_held' => $pairsAvailable,
                    'left_in' => $leftIn,
                    'right_in' => $rightIn,
                ]);

                // Ineligible: carry = full team L|R (aaj tak) so team page stays in sync as downline grows.
                $lifetime = $this->subtreeVolumes->lifetimeLegVolumes($user, $scope);
                $leftOut = (int) $lifetime['left'];
                $rightOut = (int) $lifetime['right'];
            }

            $expectedMilestoneUsd = $incomeEligible
                ? $this->expectedMilestonePayoutUsd($user, $scope, $pairsMatched)
                : '0.00';
            $expectedTotalUsd = bcadd($payout, $expectedMilestoneUsd, 2);

            $walletTxId = $existingClosing?->wallet_transaction_id;
            $balanceAfter = (string) $user->wallet_balance;

            $perPairPayout = $incomeAlreadyPaid && $existingClosing !== null
                ? (string) (($existingClosing->meta ?? [])['per_pair_paid_usd'] ?? $payout)
                : $payout;

            if ($incomeEligible && ! $incomeAlreadyPaid && bccomp($perPairPayout, '0.00', 2) > 0) {
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

            // Ineligible: carry columns = full team L|R; eligible users follow match/lapse math above.
            $user->{$leftCol} = $leftOut;
            $user->{$rightCol} = $rightOut;
            $user->save();

            $milestonePaidUsd = '0.00';
            $milestoneMeta = [];
            if ($incomeAlreadyPaid && $existingClosing !== null) {
                $prevMeta = is_array($existingClosing->meta) ? $existingClosing->meta : [];
                $milestonePaidUsd = (string) ($prevMeta['milestone_paid_usd'] ?? '0.00');
                $milestoneMeta = [
                    'milestone' => $prevMeta['milestone'] ?? null,
                    'pairs_today' => $prevMeta['milestone_pairs_today'] ?? null,
                    'lapsed_pairs' => $prevMeta['milestone_lapsed_pairs'] ?? null,
                ];
                $totalPayout = (string) $existingClosing->payout_usd;
                $balanceAfter = (string) ($existingClosing->balance_after_usd ?? $user->wallet_balance);
            } else {
                if ($incomeEligible && $pairsMatched > 0) {
                    if ($scope === BinaryDailyClosing::SCOPE_PANEL) {
                        $r = $this->subPanelMatching->applyMatchedPairs($user, $pairsMatched, null, $closingDateStr);
                        $milestonePaidUsd = (string) $r['payout_usd'];
                        $milestoneMeta = $r;
                    } elseif ($scope === BinaryDailyClosing::SCOPE_SUPER) {
                        $r = $this->superSubPanelMatching->applyMatchedPairs($user, $pairsMatched, null, $closingDateStr);
                        $milestonePaidUsd = (string) $r['payout_usd'];
                        $milestoneMeta = $r;
                    }
                    if (! empty($milestoneMeta['wallet_transaction_id'])) {
                        $walletTxId = (int) $milestoneMeta['wallet_transaction_id'];
                    }
                    $user->save();
                    $balanceAfter = (string) $user->wallet_balance;
                }

                $totalPayout = bcadd($payout, $milestonePaidUsd, 2);
            }

            if (
                $incomeEligible
                && ! $incomeAlreadyPaid
                && ! $this->payoutMatchesExpected($expectedTotalUsd, $totalPayout, $expectedMilestoneUsd, $milestonePaidUsd, $payout, $perPairPayout)
            ) {
                Log::error('binary_closing.payout_mismatch', [
                    'user_id' => $userId,
                    'scope' => $scope,
                    'closing_date' => $closingDateStr,
                    'expected_total' => $expectedTotalUsd,
                    'actual_total' => $totalPayout,
                    'expected_per_pair' => $payout,
                    'actual_per_pair' => $payout,
                    'expected_milestone' => $expectedMilestoneUsd,
                    'actual_milestone' => $milestonePaidUsd,
                ]);

                throw new \RuntimeException(sprintf(
                    'Closing payout verification failed for user %d scope %s date %s',
                    $userId,
                    $scope,
                    $closingDateStr,
                ));
            }

            $closingPayload = [
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
                'meta' => array_merge(is_array($existingClosing?->meta) ? $existingClosing->meta : [], [
                    'pairs_available' => $pairsAvailable,
                    'max_pairs_per_day' => $maxPairs,
                    'timezone' => $this->timezone(),
                    'per_pair_paid_usd' => $perPairPayout,
                    'milestone_paid_usd' => $milestonePaidUsd,
                    'milestone' => $milestoneMeta['milestone'] ?? null,
                    'milestone_pairs_today' => $milestoneMeta['pairs_today'] ?? null,
                    'milestone_lapsed_pairs' => $milestoneMeta['lapsed_pairs'] ?? null,
                    'daily_carry_ledger' => $useDailyLedger,
                    'daily_left' => $dailyLeft,
                    'daily_right' => $dailyRight,
                    'opening_carry_left' => (int) $matchInputs['opening_left_out'],
                    'opening_carry_right' => (int) $matchInputs['opening_right_out'],
                    'opening_from_previous_close' => (bool) ($matchInputs['opening_from_previous_close'] ?? false),
                    'subtree_total_left' => (int) $matchInputs['total_left'],
                    'subtree_total_right' => (int) $matchInputs['total_right'],
                    'stored_carry_left_before' => $storedLeft,
                    'stored_carry_right_before' => $storedRight,
                    'income_eligible' => $incomeEligible,
                    'income_blocked_reason' => $incomeBlockedReason,
                    'pairs_held' => $incomeEligible ? 0 : $pairsAvailable,
                    'income_already_paid' => $incomeAlreadyPaid,
                    'refreshed_at' => $existingClosing !== null ? now()->toIso8601String() : null,
                ]),
            ];

            if ($walletTxId !== null) {
                $closingPayload['wallet_transaction_id'] = $walletTxId;
            }

            if ($existingClosing !== null) {
                $existingClosing->update($closingPayload);
                $closing = $existingClosing->fresh();
            } else {
                $closing = BinaryDailyClosing::create(array_merge([
                    'user_id' => $user->id,
                    'closing_date' => $date->toDateString(),
                    'scope' => $scope,
                ], $closingPayload));
            }

            if ($incomeEligible && ! $incomeAlreadyPaid && bccomp((string) $totalPayout, '0.00', 2) > 0) {
                $linkedTxId = $walletTxId;
                if ($linkedTxId === null && bccomp($milestonePaidUsd, '0.00', 2) > 0) {
                    $linkedTxId = WalletTransaction::query()
                        ->where('user_id', $user->id)
                        ->where('type', $txType)
                        ->latest('id')
                        ->value('id');
                }

                MatchingPayout::query()->updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'scope' => $scope,
                        'closing_date' => $date->toDateString(),
                    ],
                    [
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
                    ],
                );
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

    /**
     * True when this user/scope/date already received wallet credit (first close only pays once).
     */
    private function closingIncomeAlreadyPaid(
        int $userId,
        string $scope,
        string $closingDate,
        string $txType,
        ?BinaryDailyClosing $existing,
    ): bool {
        if ($existing === null) {
            return false;
        }

        if ($existing->wallet_transaction_id !== null) {
            return true;
        }

        if (MatchingPayout::query()
            ->where('user_id', $userId)
            ->where('scope', $scope)
            ->whereDate('closing_date', $closingDate)
            ->exists()) {
            return true;
        }

        if (bccomp((string) $existing->payout_usd, '0.00', 2) <= 0) {
            return false;
        }

        $types = array_values(array_unique(array_filter([
            $txType,
            $scope === BinaryDailyClosing::SCOPE_PANEL ? WalletTransaction::TYPE_SUB_PANEL_MATCHING : null,
            $scope === BinaryDailyClosing::SCOPE_SUPER ? WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING : null,
        ])));

        if (WalletTransaction::query()
            ->where('user_id', $userId)
            ->whereIn('type', $types)
            ->where('meta->closing_date', $closingDate)
            ->where('meta->source', 'binary_daily_closing')
            ->exists()) {
            return true;
        }

        // Milestone credits created before closing_date was stored in tx meta.
        if ($scope === BinaryDailyClosing::SCOPE_PANEL) {
            return WalletTransaction::query()
                ->where('user_id', $userId)
                ->where('type', WalletTransaction::TYPE_SUB_PANEL_MATCHING)
                ->where('meta->closing_date', $closingDate)
                ->exists();
        }

        if ($scope === BinaryDailyClosing::SCOPE_SUPER) {
            return WalletTransaction::query()
                ->where('user_id', $userId)
                ->where('type', WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING)
                ->where('meta->closing_date', $closingDate)
                ->exists();
        }

        return false;
    }

    /**
     * Milestone table income for this closing only (today's matched pairs — no extra tier).
     */
    private function expectedMilestonePayoutUsd(User $user, string $scope, int $pairsMatched): string
    {
        if ($pairsMatched <= 0 || ! $user->qualifiesBinaryClosingIncome($scope)) {
            return '0.00';
        }

        if ($scope === BinaryDailyClosing::SCOPE_PANEL) {

            $tier = MatchingMilestoneTable::nearestTierAtOrBelow($pairsMatched, 'sub_panel_matching.milestones');
            if ($tier <= 0) {
                return '0.00';
            }

            $raw = MatchingMilestoneTable::payoutUsdForTier($tier, 'panel');

            return $this->applyMilestoneDailyCap($user->id, $raw, WalletTransaction::TYPE_SUB_PANEL_MATCHING, 'sub_panel_matching.daily_cap_usd');
        }

        if ($scope === BinaryDailyClosing::SCOPE_SUPER) {
            $tier = MatchingMilestoneTable::nearestTierAtOrBelow($pairsMatched, 'super_sub_panel_matching.milestones');
            if ($tier <= 0) {
                return '0.00';
            }

            $raw = MatchingMilestoneTable::payoutUsdForTier($tier, 'super');

            return $this->applyMilestoneDailyCap($user->id, $raw, WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING, 'super_sub_panel_matching.daily_cap_usd');
        }

        return '0.00';
    }

    private function applyMilestoneDailyCap(int $userId, string $payout, string $txType, string $capConfigKey): string
    {
        $cap = (string) config($capConfigKey, '256.00');
        $earnedToday = BinaryClosingCalendar::sumWalletCreditsSinceCycleStart($userId, $txType);
        $remaining = bcsub($cap, $earnedToday, 2);
        if (bccomp($payout, $remaining, 2) > 0) {
            return bccomp($remaining, '0.00', 2) > 0 ? $remaining : '0.00';
        }

        return $payout;
    }

    /**
     * Second check: expected (pre-calculated) must equal actual wallet credits.
     */
    private function payoutMatchesExpected(
        string $expectedTotal,
        string $actualTotal,
        string $expectedMilestone,
        string $actualMilestone,
        string $expectedPerPair,
        string $actualPerPair,
    ): bool {
        return bccomp($expectedTotal, $actualTotal, 2) === 0
            && bccomp($expectedMilestone, $actualMilestone, 2) === 0
            && bccomp($expectedPerPair, $actualPerPair, 2) === 0;
    }
}

<?php

namespace App\Services;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Support\BinaryClosingCalendar;
use App\Support\BinaryClosingDisplay;
use App\Support\BinaryWeakSideLapse;
use Illuminate\Support\Facades\DB;

/**
 * Active-panel binary matching ($10 minimum-panel-fee tier).
 *
 * Trigger: when a user pays their $10 minimum-panel-fee (the second leg of the
 *          $11 active-panel activation flow), every binary ancestor up the chain
 *          receives +1 carry on the leg the user falls under (relative to that
 *          ancestor). This is the standard binary MLM "spillover up" model:
 *          1 left active anywhere in the LEFT leg + 1 right active anywhere in
 *          the RIGHT leg = 1 matching pair for the earner above.
 *
 * Pair income (default): 10 USDT × 10% = 1 USDT per matched pair, configurable
 * via config/binary_closing.php (scope = active_panel). Pair matching itself is
 * performed by the daily binary closing job.
 *
 * In real-time mode (closing disabled) we also pay $1 per pair immediately,
 * matching at every ancestor that already has both legs > 0.
 */
class ActivePanelMatchingService
{
    /** Defensive cap — binary trees can theoretically grow very deep. */
    private const MAX_UPLINE_WALK = 100000;

    /**
     * Call right after a user's minimum_panel_fee_paid_at gets stamped. Walks
     * up the entire binary upline chain and awards +1 carry to every ancestor
     * on the leg the activated user belongs to.
     */
    public function processActivePanelActivation(User $user): void
    {
        if ($user->binary_parent_id === null) {
            return;
        }

        DB::transaction(function () use ($user) {
            $touchedAncestorIds = [];

            if ($this->isDailyClosingActive()) {
                return;
            }

            $childId = (int) $user->id;
            $childSide = strtolower((string) $user->binary_side);
            $parentId = (int) $user->binary_parent_id;

            for ($depth = 0; $depth < self::MAX_UPLINE_WALK; $depth++) {
                if ($parentId === 0) {
                    break;
                }
                if (! in_array($childSide, ['left', 'right'], true)) {
                    break;
                }

                /** @var User|null $ancestor */
                $ancestor = User::whereKey($parentId)->lockForUpdate()->first();
                if ($ancestor === null) {
                    break;
                }

                if ($childSide === 'left') {
                    $ancestor->active_panel_match_carry_left = (int) $ancestor->active_panel_match_carry_left + 1;
                } else {
                    $ancestor->active_panel_match_carry_right = (int) $ancestor->active_panel_match_carry_right + 1;
                }
                $ancestor->save();

                $touchedAncestorIds[] = (int) $ancestor->id;

                $childId = (int) $ancestor->id;
                $childSide = strtolower((string) $ancestor->binary_side);
                $parentId = (int) ($ancestor->binary_parent_id ?? 0);
            }

            // Real-time fallback: try to match pairs at every ancestor we
            // touched (one of them might now have both legs > 0).
            foreach ($touchedAncestorIds as $aid) {
                $ancestor = User::whereKey($aid)->lockForUpdate()->first();
                if ($ancestor !== null) {
                    $this->matchPairsRealtime($ancestor);
                }
            }
        });
    }

    /**
     * Real-time fallback when daily closing is disabled — pays $1 per pair up to
     * the configured daily cap, deducts from both legs, no carry-forward / lapse
     * (those are closing-only concepts).
     */
    private function matchPairsRealtime(User $earner): void
    {
        if (! $earner->qualifiesActivePanelistIncome()) {
            return;
        }

        $perPair = $this->normalizeUsd((string) config('binary_closing.scopes.active_panel.pair_income_usd', '1.00'));
        $maxPairs = max(0, (int) config('binary_closing.scopes.active_panel.max_pairs_per_day', 20));

        $usedToday = $this->matchingPairsUsedToday($earner->id);
        if ($usedToday >= $maxPairs) {
            return;
        }

        $left = (int) $earner->active_panel_match_carry_left;
        $right = (int) $earner->active_panel_match_carry_right;
        $available = min($left, $right);
        if ($available <= 0) {
            return;
        }

        $pairs = min($available, $maxPairs - $usedToday);
        if ($pairs <= 0) {
            return;
        }

        $earner->active_panel_match_carry_left = $left - $pairs;
        $earner->active_panel_match_carry_right = $right - $pairs;

        $payout = bcmul((string) $pairs, $perPair, 2);
        $newBalance = bcadd((string) $earner->wallet_balance, $payout, 2);
        $earner->wallet_balance = $newBalance;
        $earner->save();

        WalletTransaction::create([
            'user_id' => $earner->id,
            'type' => WalletTransaction::TYPE_ACTIVE_PANEL_MATCHING,
            'amount' => $payout,
            'balance_after' => $newBalance,
            'meta' => [
                'pairs' => $pairs,
                'per_pair_usd' => $perPair,
                'source' => 'realtime',
            ],
        ]);
    }

    public function isDailyClosingActive(): bool
    {
        if (! (bool) config('binary_closing.enabled', false)) {
            return false;
        }

        return (bool) config('binary_closing.scopes.active_panel.enabled', false);
    }

    public function matchingPairsUsedToday(int $userId): int
    {
        $sum = WalletTransaction::query()
            ->where('user_id', $userId)
            ->where('type', WalletTransaction::TYPE_ACTIVE_PANEL_MATCHING)
            ->where('created_at', '>=', BinaryClosingCalendar::currentCycleStart())
            ->get()
            ->sum(fn (WalletTransaction $t) => (int) ($t->meta['pairs'] ?? 0));

        return (int) $sum;
    }

    /**
     * Lifetime active-panel activations under the earner's full left/right legs
     * (i.e. how many minimum_panel_fee_paid_at users sit anywhere below).
     *
     * @return array{left:int,right:int}
     */
    public function lifetimeActivePanelistsInLegs(User $earner): array
    {
        return [
            'left' => $this->countActivePanelistsInSubtree($earner->left_child_id),
            'right' => $this->countActivePanelistsInSubtree($earner->right_child_id),
        ];
    }

    private function countActivePanelistsInSubtree(?int $rootId): int
    {
        if ($rootId === null) {
            return 0;
        }

        $total = 0;
        $frontier = [$rootId];

        while ($frontier !== []) {
            $nodes = User::query()
                ->whereIn('id', $frontier)
                ->get(['id', 'left_child_id', 'right_child_id', 'minimum_panel_fee_paid_at']);

            $frontier = [];
            foreach ($nodes as $node) {
                if ($node->minimum_panel_fee_paid_at !== null) {
                    $total++;
                }
                if ($node->left_child_id !== null) {
                    $frontier[] = (int) $node->left_child_id;
                }
                if ($node->right_child_id !== null) {
                    $frontier[] = (int) $node->right_child_id;
                }
            }
        }

        return $total;
    }

    public function status(User $earner): array
    {
        $perPair = $this->normalizeUsd((string) config('binary_closing.scopes.active_panel.pair_income_usd', '1.00'));
        $max = (int) config('binary_closing.scopes.active_panel.max_pairs_per_day', 20);
        $used = $this->matchingPairsUsedToday($earner->id);
        $todayInputs = app(BinarySubtreeVolumeService::class)->closingMatchInputs(
            $earner,
            BinaryDailyClosing::SCOPE_ACTIVE_PANEL,
            \Carbon\CarbonImmutable::parse(BinaryClosingCalendar::todayDateString(), BinaryClosingCalendar::timezone()),
        );
        $carryL = (int) $todayInputs['left_in'];
        $carryR = (int) $todayInputs['right_in'];
        $available = min($carryL, $carryR);
        $lifetime = $this->lifetimeActivePanelistsInLegs($earner);
        $weakLeg = min($lifetime['left'], $lifetime['right']);
        $structureClosing = BinaryDailyClosing::latestForDisplay(
            $earner->id,
            BinaryDailyClosing::SCOPE_ACTIVE_PANEL,
        );
        $firstPaidClosing = BinaryClosingDisplay::firstPaidInCurrentCycle(
            $earner->id,
            BinaryDailyClosing::SCOPE_ACTIVE_PANEL,
        );
        $incomeLocked = BinaryClosingDisplay::incomeLockedInCurrentCycle(
            $earner->id,
            BinaryDailyClosing::SCOPE_ACTIVE_PANEL,
        );
        // Before payout: projected pairs from lifetime legs; after payout: closing audit only.
        $display = BinaryWeakSideLapse::splitFromLegCounts(
            $lifetime['left'],
            $lifetime['right'],
            $max,
        );
        $structureWeak = BinaryWeakSideLapse::fromClosing($structureClosing);

        $earnedToday = $incomeLocked
            ? BinaryClosingDisplay::lockedPayoutUsd($firstPaidClosing)
            : BinaryClosingCalendar::sumWalletCreditsSinceCycleStart(
                $earner->id,
                WalletTransaction::TYPE_ACTIVE_PANEL_MATCHING,
            );
        $pairsPaidToday = $incomeLocked
            ? (int) $firstPaidClosing->pairs_matched
            : $used;

        $tierRows = [];
        for ($p = 1; $p <= $max; $p++) {
            $tierRows[] = [
                'matching_panels' => $p,
                'income_usd' => bcmul((string) $p, $perPair, 2),
            ];
        }

        return [
            'eligible' => $earner->qualifiesActivePanelistIncome(),
            'income_mode' => 'per_pair_daily_cap',
            'carry_left' => $carryL,
            'carry_right' => $carryR,
            'total_left_active_panels' => $lifetime['left'],
            'total_right_active_panels' => $lifetime['right'],
            'weak_leg' => $weakLeg,
            'strong_leg_carry_diff' => abs($lifetime['left'] - $lifetime['right']),
            'pairs_available' => $available,
            'pairs_paid_today' => $pairsPaidToday,
            'pairs_matched_last_closing' => (int) ($structureClosing?->pairs_matched ?? 0),
            'display_pairs_matched_today' => $incomeLocked
                ? (int) ($structureClosing?->pairs_matched ?? $firstPaidClosing->pairs_matched)
                : $display['pairs_matched'],
            'display_carry_left' => $incomeLocked
                ? (int) ($structureClosing?->left_carry_out ?? $carryL)
                : $display['left_out'],
            'display_carry_right' => $incomeLocked
                ? (int) ($structureClosing?->right_carry_out ?? $carryR)
                : $display['right_out'],
            'today_weak_side' => $incomeLocked
                ? ($structureWeak['side'] ?? $display['weak_side'])
                : $display['weak_side'],
            'today_weak_lapsed' => $incomeLocked
                ? $structureWeak['lapsed']
                : $display['weak_lapsed'],
            'today_left_lapsed' => $incomeLocked
                ? (int) ($structureClosing?->left_lapsed ?? 0)
                : ($display['weak_side'] === 'left' ? $display['weak_lapsed'] : 0),
            'today_right_lapsed' => $incomeLocked
                ? (int) ($structureClosing?->right_lapsed ?? 0)
                : ($display['weak_side'] === 'right' ? $display['weak_lapsed'] : 0),
            'today_left_carry_out' => $incomeLocked
                ? (int) ($structureClosing?->left_carry_out ?? 0)
                : $display['left_out'],
            'today_right_carry_out' => $incomeLocked
                ? (int) ($structureClosing?->right_carry_out ?? 0)
                : $display['right_out'],
            'earned_today_usd' => $earnedToday,
            'pairs_remaining_today' => $incomeLocked ? 0 : max(0, $max - $used),
            'pairs_payable_today' => $incomeLocked ? 0 : min($available, max(0, $max - $used)),
            'income_projection_locked' => $incomeLocked,
            'max_pairs_per_day' => $max,
            'per_pair_income_usd' => $perPair,
            'tier_rows' => $tierRows,
            'last_closing_date' => $structureClosing?->closing_date?->toDateString(),
        ];
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

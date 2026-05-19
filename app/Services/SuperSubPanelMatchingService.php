<?php

namespace App\Services;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Support\MatchingTodayStats;
use Illuminate\Support\Facades\DB;

class SuperSubPanelMatchingService
{
    /** Defensive cap — binary trees can theoretically grow very deep. */
    private const MAX_UPLINE_WALK = 100000;

    public function earnedToday(int $userId): string
    {
        $sum = WalletTransaction::query()
            ->where('user_id', $userId)
            ->where('type', WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING)
            ->whereDate('created_at', now()->toDateString())
            ->sum('amount');

        return number_format((float) ($sum ?? 0), 2, '.', '');
    }

    /**
     * After a user buys another $100 super sub panel — walks the FULL binary upline
     * chain crediting +1 carry to every ancestor's appropriate leg. Pays tier-based
     * milestone (10× sub-panel table) when the counter reaches a milestone.
     */
    public function processSuperSubPanelPurchase(User $buyer): void
    {
        if ($buyer->binary_parent_id === null) {
            return;
        }

        DB::transaction(function () use ($buyer) {
            $touchedAncestorIds = [];

            $childSide = strtolower((string) $buyer->binary_side);
            $parentId = (int) $buyer->binary_parent_id;

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
                    $ancestor->super_panel_match_carry_left = (int) $ancestor->super_panel_match_carry_left + 1;
                } else {
                    $ancestor->super_panel_match_carry_right = (int) $ancestor->super_panel_match_carry_right + 1;
                }
                $ancestor->save();

                $touchedAncestorIds[] = (int) $ancestor->id;

                $childSide = strtolower((string) $ancestor->binary_side);
                $parentId = (int) ($ancestor->binary_parent_id ?? 0);
            }

            // Daily-closing source-of-truth for super-sub-panel scope: skip the
            // real-time pair-matching loop and let the midnight cron credit pairs.
            if ($this->isDailyClosingActive()) {
                return;
            }

            // Real-time fallback: try to match pairs at every ancestor we touched.
            foreach ($touchedAncestorIds as $aid) {
                $earner = User::whereKey($aid)->lockForUpdate()->first();
                if ($earner !== null) {
                    $this->matchPairsRealtime($earner);
                }
            }
        });
    }

    /**
     * Real-time pair matching for a single earner (used only when daily closing is disabled).
     */
    private function matchPairsRealtime(User $earner): void
    {
        $left = (int) $earner->super_panel_match_carry_left;
        $right = (int) $earner->super_panel_match_carry_right;

        $cap = (string) config('super_sub_panel_matching.daily_cap_usd');

        while (true) {
            $avail = min($left, $right);
            if ($avail <= 0) {
                break;
            }

            $earned = $this->earnedToday($earner->id);
            $eligible = $earner->qualifiesForSuperSubPanelMatchingIncome();
            $canSuper = $eligible && bccomp($earned, $cap, 2) < 0;

            if (! $canSuper) {
                break;
            }

            $left--;
            $right--;

            $this->applyMatchedPairs($earner, 1);

            $earner->super_panel_match_carry_left = $left;
            $earner->super_panel_match_carry_right = $right;
            $earner->save();
        }
    }

    /**
     * True when the binary daily-closing system owns the super-sub-panel scope.
     */
    public function isDailyClosingActive(): bool
    {
        if (! (bool) config('binary_closing.enabled', false)) {
            return false;
        }

        return (bool) config('binary_closing.scopes.super.enabled', false);
    }

    /**
     * Pay the highest super-milestone reached by TODAY'S matched pairs only
     * (× income_multiplier, default 10×). Excess pairs above the milestone
     * LAPSE — they do not roll forward to the next day. Mutates the user
     * model in memory; the caller is responsible for saving.
     *
     * @return array{milestone:int, payout_usd:string, pairs_today:int, lapsed_pairs:int}
     */
    public function applyMatchedPairs(User $earner, int $pairsToday): array
    {
        $today = max(0, (int) $pairsToday);
        // Counter is reset every closing — milestones evaluated on a single
        // day's matched pairs (excess lapses).
        $earner->sspm_pair_carry_forward = 0;

        $result = [
            'milestone' => 0,
            'payout_usd' => '0.00',
            'pairs_today' => $today,
            'lapsed_pairs' => $today,
        ];

        if ($today <= 0 || ! $earner->qualifiesForSuperSubPanelMatchingIncome()) {
            return $result;
        }

        $milestones = (array) config('super_sub_panel_matching.milestones', []);
        rsort($milestones, SORT_NUMERIC);

        $highest = 0;
        foreach ($milestones as $m) {
            $m = (int) $m;
            if ($m > 0 && $today >= $m) {
                $highest = $m;
                break;
            }
        }

        if ($highest <= 0) {
            // Pairs below smallest milestone: lapse them all.
            return $result;
        }

        $mult = (string) config('super_sub_panel_matching.income_multiplier', '10');
        $payout = bcmul((string) $highest, $mult, 2);

        $cap = (string) config('super_sub_panel_matching.daily_cap_usd', '2560.00');
        $earnedToday = $this->earnedToday($earner->id);
        $remaining = bcsub($cap, $earnedToday, 2);
        if (bccomp($payout, $remaining, 2) > 0) {
            $payout = bccomp($remaining, '0.00', 2) > 0 ? $remaining : '0.00';
        }

        if (bccomp($payout, '0.00', 2) <= 0) {
            return $result;
        }

        $lapsed = max(0, $today - $highest);
        $newBalance = bcadd((string) $earner->wallet_balance, $payout, 2);
        $earner->wallet_balance = $newBalance;

        WalletTransaction::create([
            'user_id' => $earner->id,
            'type' => WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING,
            'amount' => $payout,
            'balance_after' => $newBalance,
            'meta' => [
                'milestone' => $highest,
                'pairs_today' => $today,
                'lapsed_pairs' => $lapsed,
                'income_multiplier' => $mult,
                'rate' => (string) config('super_sub_panel_matching.rate', '0.10'),
            ],
        ]);

        return [
            'milestone' => $highest,
            'payout_usd' => $payout,
            'pairs_today' => $today,
            'lapsed_pairs' => $lapsed,
        ];
    }

    /**
     * Lifetime super-sub-panel purchases across the earner's full left/right binary legs.
     *
     * @return array{left:int,right:int}
     */
    public function lifetimeSuperSubPanelBuys(User $earner): array
    {
        return [
            'left' => $this->sumSuperSubPanelsInSubtree($earner->left_child_id),
            'right' => $this->sumSuperSubPanelsInSubtree($earner->right_child_id),
        ];
    }

    private function sumSuperSubPanelsInSubtree(?int $rootId): int
    {
        if ($rootId === null) {
            return 0;
        }

        $total = 0;
        $frontier = [$rootId];

        while ($frontier !== []) {
            $nodes = User::query()
                ->whereIn('id', $frontier)
                ->get(['id', 'left_child_id', 'right_child_id', 'super_sub_panel_count']);

            $frontier = [];
            foreach ($nodes as $node) {
                $total += (int) $node->super_sub_panel_count;

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
        $cap = (string) config('super_sub_panel_matching.daily_cap_usd');
        $earned = $this->earnedToday($earner->id);
        $remaining = bcsub($cap, $earned, 2);
        if (bccomp($remaining, '0.00', 2) < 0) {
            $remaining = '0.00';
        }

        $mult = (string) config('super_sub_panel_matching.income_multiplier');
        $milestones = config('super_sub_panel_matching.milestones');
        $tiers = [];
        foreach ($milestones as $panels) {
            $tiers[] = [
                'matching_panels' => $panels,
                'income_usd' => bcmul((string) $panels, $mult, 2),
            ];
        }

        $lifetime = $this->lifetimeSuperSubPanelBuys($earner);
        $todayClosing = MatchingTodayStats::todayClosing($earner->id, BinaryDailyClosing::SCOPE_SUPER);
        $pairsToday = MatchingTodayStats::pairsMatchedToday(
            $earner->id,
            BinaryDailyClosing::SCOPE_SUPER,
            WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING,
        );
        $todayMilestone = (int) ($todayClosing?->meta['milestone'] ?? 0);
        if ($todayMilestone <= 0 && $pairsToday > 0) {
            $sortedMilestones = array_values((array) config('super_sub_panel_matching.milestones', []));
            rsort($sortedMilestones, SORT_NUMERIC);
            foreach ($sortedMilestones as $m) {
                $m = (int) $m;
                if ($m > 0 && $pairsToday >= $m) {
                    $todayMilestone = $m;
                    break;
                }
            }
        }
        $milestoneMask = 0;
        foreach (array_values((array) config('super_sub_panel_matching.milestones', [])) as $idx => $m) {
            if ((int) $m > 0 && (int) $m === $todayMilestone) {
                $milestoneMask |= (1 << $idx);
                break;
            }
        }

        return [
            'eligible' => $earner->qualifiesForSuperSubPanelMatchingIncome(),
            'daily_cap_usd' => $cap,
            'earned_today_usd' => $earned,
            'remaining_cap_usd' => $remaining,
            'cumulative_matched_panels_today' => $pairsToday,
            'milestones_hit_mask' => $milestoneMask,
            'today_milestone_lapsed_pairs' => MatchingTodayStats::lapsedPairsToday(
                $todayClosing,
                $earner->id,
                WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING,
            ),
            'today_milestone_paid_usd' => MatchingTodayStats::milestonePaidUsdDisplay($todayClosing, $earned),
            'carry_left' => (int) $earner->super_panel_match_carry_left,
            'carry_right' => (int) $earner->super_panel_match_carry_right,
            /** Lifetime cumulative left/right super-sub-panel buys (live). */
            'total_left_supers' => $lifetime['left'],
            'total_right_supers' => $lifetime['right'],
            'pairs_available' => min((int) $earner->super_panel_match_carry_left, (int) $earner->super_panel_match_carry_right),
            'tier_rows' => $tiers,
            'income_multiplier' => $mult,
            'rate' => (string) config('super_sub_panel_matching.rate'),
        ];
    }
}

<?php

namespace App\Services;

use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;

class SuperSubPanelMatchingService
{
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
     * After a user buys another $100 super sub panel — update binary upline carry and pay tabular milestones (10× sub-panel table).
     */
    public function processSuperSubPanelPurchase(User $buyer): void
    {
        $parentId = $buyer->binary_parent_id;
        if ($parentId === null) {
            return;
        }

        $side = strtolower((string) $buyer->binary_side);
        if (! in_array($side, ['left', 'right'], true)) {
            return;
        }

        DB::transaction(function () use ($parentId, $side) {
            /** @var User $earner */
            $earner = User::whereKey($parentId)->lockForUpdate()->firstOrFail();

            if ($side === 'left') {
                $earner->super_panel_match_carry_left = (int) $earner->super_panel_match_carry_left + 1;
            } else {
                $earner->super_panel_match_carry_right = (int) $earner->super_panel_match_carry_right + 1;
            }

            $earner->save();

            // Daily-closing source-of-truth for super-sub-panel scope: skip the
            // real-time pair-matching loop and let the midnight cron credit pairs.
            if ($this->isDailyClosingActive()) {
                return;
            }

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

                // Tier-based milestone counter is advanced by 1 pair; the
                // actual payout only fires when the counter reaches the next
                // milestone (handled inside applyMatchedPairs).
                $this->applyMatchedPairs($earner, 1);

                $earner->super_panel_match_carry_left = $left;
                $earner->super_panel_match_carry_right = $right;
                $earner->save();
            }
        });
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

        return [
            'eligible' => $earner->qualifiesForSuperSubPanelMatchingIncome(),
            'daily_cap_usd' => $cap,
            'earned_today_usd' => $earned,
            'remaining_cap_usd' => $remaining,
            'cumulative_matched_panels_today' => (int) ($earner->sspm_match_day !== null && now()->isSameDay($earner->sspm_match_day) ? $earner->sspm_cumulative_panels : 0),
            'milestones_hit_mask' => (int) ($earner->sspm_match_day !== null && now()->isSameDay($earner->sspm_match_day) ? $earner->sspm_milestone_mask : 0),
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

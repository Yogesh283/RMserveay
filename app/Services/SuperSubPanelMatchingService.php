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

                $this->applyPairMilestone($earner);

                $earner->super_panel_match_carry_left = $left;
                $earner->super_panel_match_carry_right = $right;
                $earner->save();
            }
        });
    }

    /**
     * One matched pair on the $100 super-sub carry (+2 cumulative matched panels today).
     */
    public function applyPairMilestone(User $earner): void
    {
        if (! $earner->qualifiesForSuperSubPanelMatchingIncome()) {
            return;
        }

        if ($earner->sspm_match_day === null || ! now()->isSameDay($earner->sspm_match_day)) {
            $earner->sspm_match_day = now()->startOfDay();
            $earner->sspm_cumulative_panels = 0;
            $earner->sspm_milestone_mask = 0;
        }

        $earner->sspm_cumulative_panels = min(65535, (int) $earner->sspm_cumulative_panels + 2);
        $m = (int) $earner->sspm_cumulative_panels;

        $milestones = config('super_sub_panel_matching.milestones');
        if (! in_array($m, $milestones, true)) {
            return;
        }

        $tierIndex = array_search($m, $milestones, true);
        if (! is_int($tierIndex)) {
            return;
        }

        $mask = (int) $earner->sspm_milestone_mask;
        $bit = 1 << $tierIndex;

        if (($mask & $bit) !== 0) {
            return;
        }

        $mult = (string) config('super_sub_panel_matching.income_multiplier');
        $pay = bcmul((string) $m, $mult, 2);

        $cap = (string) config('super_sub_panel_matching.daily_cap_usd');
        $earned = $this->earnedToday($earner->id);
        $remaining = bcsub($cap, $earned, 2);
        if (bccomp($remaining, '0.00', 2) <= 0) {
            return;
        }

        $actual = bccomp($pay, $remaining, 2) <= 0 ? $pay : $remaining;

        if (bccomp($actual, '0.00', 2) <= 0) {
            return;
        }

        $newBalance = bcadd((string) $earner->wallet_balance, $actual, 2);
        $earner->wallet_balance = $newBalance;
        $earner->sspm_milestone_mask = $mask | $bit;

        WalletTransaction::create([
            'user_id' => $earner->id,
            'type' => WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING,
            'amount' => $actual,
            'balance_after' => $newBalance,
            'meta' => [
                'cumulative_matched_panels' => $m,
                'milestone_panels' => $m,
                'tier_index' => $tierIndex,
                'intended_usd' => $pay,
                'income_multiplier' => $mult,
                'capped' => bccomp($actual, $pay, 2) !== 0,
                'rate' => (string) config('super_sub_panel_matching.rate'),
            ],
        ]);
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

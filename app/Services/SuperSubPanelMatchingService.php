<?php

namespace App\Services;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Support\BinaryClosingCalendar;
use App\Support\BinaryClosingDisplay;
use App\Support\BinaryWeakSideLapse;
use Illuminate\Support\Facades\DB;

class SuperSubPanelMatchingService
{
    /** Defensive cap — binary trees can theoretically grow very deep. */
    private const MAX_UPLINE_WALK = 100000;

    private function highestMilestoneFor(int $weakLeg): int
    {
        $milestones = (array) config('super_sub_panel_matching.milestones', []);
        rsort($milestones, SORT_NUMERIC);

        foreach ($milestones as $m) {
            $m = (int) $m;
            if ($m > 0 && $weakLeg >= $m) {
                return $m;
            }
        }

        return 0;
    }

    public function earnedToday(int $userId): string
    {
        return BinaryClosingCalendar::sumWalletCreditsSinceCycleStart(
            $userId,
            WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING,
        );
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
     * Pay the highest super-milestone from the weaker leg's lifetime super count
     * (× income_multiplier, default 10×). Daily closing passes subtree totals;
     * real-time mode uses today's pair count only.
     *
     * @return array{milestone:int, payout_usd:string, pairs_today:int, weak_leg:int, lapsed_pairs:int}
     */
    public function applyMatchedPairs(User $earner, int $pairsToday, ?int $weakLegLifetime = null): array
    {
        $today = max(0, (int) $pairsToday);
        $earner->sspm_pair_carry_forward = 0;

        $weakLeg = $weakLegLifetime !== null
            ? max(0, (int) $weakLegLifetime)
            : $today;

        $result = [
            'milestone' => 0,
            'payout_usd' => '0.00',
            'pairs_today' => $today,
            'weak_leg' => $weakLeg,
            'lapsed_pairs' => $weakLeg,
        ];

        if ($today <= 0 || ! $earner->qualifiesForSuperSubPanelMatchingIncome()) {
            return $result;
        }

        $milestones = (array) config('super_sub_panel_matching.milestones', []);
        rsort($milestones, SORT_NUMERIC);

        $highest = 0;
        foreach ($milestones as $m) {
            $m = (int) $m;
            if ($m > 0 && $weakLeg >= $m) {
                $highest = $m;
                break;
            }
        }

        if ($highest <= 0) {
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

        $lapsed = max(0, $weakLeg - $highest);
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
                'weak_leg' => $weakLeg,
                'lapsed_pairs' => $lapsed,
                'income_multiplier' => $mult,
                'rate' => (string) config('super_sub_panel_matching.rate', '0.10'),
            ],
        ]);

        return [
            'milestone' => $highest,
            'payout_usd' => $payout,
            'pairs_today' => $today,
            'weak_leg' => $weakLeg,
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
        $weakLeg = min($lifetime['left'], $lifetime['right']);
        $structureClosing = BinaryDailyClosing::latestForDisplay(
            $earner->id,
            BinaryDailyClosing::SCOPE_SUPER,
        );
        $firstPaidClosing = BinaryClosingDisplay::firstPaidInCurrentCycle(
            $earner->id,
            BinaryDailyClosing::SCOPE_SUPER,
        );
        $incomeLocked = BinaryClosingDisplay::incomeLockedInCurrentCycle(
            $earner->id,
            BinaryDailyClosing::SCOPE_SUPER,
        );
        if ($incomeLocked) {
            $earned = BinaryClosingDisplay::lockedPayoutUsd($firstPaidClosing);
            $remaining = bcsub($cap, $earned, 2);
            if (bccomp($remaining, '0.00', 2) < 0) {
                $remaining = '0.00';
            }
        }
        $applicableMilestone = $this->highestMilestoneFor($weakLeg);
        $paidMilestone = $incomeLocked
            ? BinaryClosingDisplay::lockedMilestone($firstPaidClosing)
            : (int) ($structureClosing?->meta['milestone'] ?? 0);
        if (! $incomeLocked && $paidMilestone <= 0 && bccomp($earned, '0.00', 2) > 0) {
            $paidMilestone = $applicableMilestone;
        }
        $milestoneLapsed = (int) ($structureClosing?->meta['milestone_lapsed_pairs'] ?? 0);
        $binaryWeak = BinaryWeakSideLapse::fromClosing($structureClosing);
        $weakSide = $binaryWeak['side'] ?? BinaryWeakSideLapse::sideFromLifetime($lifetime['left'], $lifetime['right']);
        $weakLapsed = $binaryWeak['lapsed'];
        $milestoneMask = 0;
        foreach (array_values($milestones) as $idx => $m) {
            if ((int) $m > 0 && (int) $m === $paidMilestone) {
                $milestoneMask |= (1 << $idx);
                break;
            }
        }

        return [
            'eligible' => $earner->qualifiesForSuperSubPanelMatchingIncome(),
            'income_mode' => 'milestone_table',
            'daily_cap_usd' => $cap,
            'earned_today_usd' => $earned,
            'remaining_cap_usd' => $remaining,
            'weak_leg' => $weakLeg,
            'current_milestone' => $incomeLocked ? $paidMilestone : $applicableMilestone,
            'table_income_usd' => $incomeLocked
                ? BinaryClosingDisplay::lockedMilestonePaidUsd($firstPaidClosing)
                : bcmul((string) $applicableMilestone, $mult, 2),
            'income_projection_locked' => $incomeLocked,
            'max_binary_pairs_per_day' => (int) config('binary_closing.scopes.super.max_pairs_per_day', 20),
            'milestones_hit_mask' => $milestoneMask,
            'today_weak_side' => $weakSide,
            'today_weak_lapsed' => $weakLapsed,
            'today_milestone_lapsed_pairs' => $milestoneLapsed,
            'today_left_lapsed' => $weakSide === 'left' ? $weakLapsed : 0,
            'today_right_lapsed' => $weakSide === 'right' ? $weakLapsed : 0,
            'today_left_carry_out' => (int) ($structureClosing?->left_carry_out ?? 0),
            'today_right_carry_out' => (int) ($structureClosing?->right_carry_out ?? 0),
            'today_milestone_paid_usd' => $incomeLocked
                ? BinaryClosingDisplay::lockedMilestonePaidUsd($firstPaidClosing)
                : (string) ($structureClosing?->meta['milestone_paid_usd'] ?? '0.00'),
            'carry_left' => (int) $earner->super_panel_match_carry_left,
            'carry_right' => (int) $earner->super_panel_match_carry_right,
            /** Lifetime cumulative left/right super-sub-panel buys (live). */
            'total_left_supers' => $lifetime['left'],
            'total_right_supers' => $lifetime['right'],
            'pairs_available' => min((int) $earner->super_panel_match_carry_left, (int) $earner->super_panel_match_carry_right),
            'tier_rows' => $tiers,
            'income_multiplier' => $mult,
            'rate' => (string) config('super_sub_panel_matching.rate'),
            'last_closing_date' => $structureClosing?->closing_date?->toDateString(),
        ];
    }
}

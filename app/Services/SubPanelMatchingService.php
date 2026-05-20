<?php

namespace App\Services;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Support\BinaryClosingCalendar;
use App\Support\BinaryClosingDisplay;
use App\Support\BinaryWeakSideLapse;

/**
 * Sub-panel matching ($10 base) — tier-based payout with excess-lapse rule.
 *
 * Rule (daily closing):
 *   - Binary carry uses weak-leg match: min(left, right) up to 20/day; strong
 *     leg keeps only the diff, weak leg surplus lapses.
 *   - Milestone income uses the weaker leg's lifetime subtree sub-panel total:
 *     highest M in {2,4,8,…,256} where weak_leg >= M → payout = $M.
 *   - Excess above M on the weak leg (weak_leg - M) is informational lapse.
 *   - No per-pair $1 stream in closing — only the milestone tier income is paid.
 */
class SubPanelMatchingService
{
    /** Highest milestone tier reached when the weaker leg has $weakLeg panels. */
    private function highestMilestoneFor(int $weakLeg): int
    {
        $milestones = (array) config('sub_panel_matching.milestones', []);
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
            WalletTransaction::TYPE_SUB_PANEL_MATCHING,
        );
    }

    /**
     * Pay the highest milestone reached by the weaker leg's lifetime sub-panel
     * count (daily closing). Real-time mode passes only today's pair count.
     *
     * @return array{milestone:int, payout_usd:string, pairs_today:int, weak_leg:int, lapsed_pairs:int}
     */
    public function applyMatchedPairs(User $earner, int $pairsToday, ?int $weakLegLifetime = null): array
    {
        $today = max(0, (int) $pairsToday);
        $earner->spm_pair_carry_forward = 0;

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

        if ($today <= 0 || ! $earner->qualifiesForPanelMatchingIncome()) {
            return $result;
        }

        $milestones = (array) config('sub_panel_matching.milestones', []);
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

        $payout = (string) $highest;

        $cap = (string) config('sub_panel_matching.daily_cap_usd', '256.00');
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
            'type' => WalletTransaction::TYPE_SUB_PANEL_MATCHING,
            'amount' => $payout,
            'balance_after' => $newBalance,
            'meta' => [
                'milestone' => $highest,
                'pairs_today' => $today,
                'weak_leg' => $weakLeg,
                'lapsed_pairs' => $lapsed,
                'rate' => (string) config('sub_panel_matching.rate', '0.10'),
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

    public function status(User $earner): array
    {
        $cap = (string) config('sub_panel_matching.daily_cap_usd');
        $earned = $this->earnedToday($earner->id);
        $remaining = bcsub($cap, $earned, 2);
        if (bccomp($remaining, '0.00', 2) < 0) {
            $remaining = '0.00';
        }

        $milestones = config('sub_panel_matching.milestones');
        $tiers = [];
        foreach ($milestones as $panels) {
            $tiers[] = [
                'matching_panels' => $panels,
                'income_usd' => (string) $panels,
            ];
        }

        // Counter does not carry across days — milestones are evaluated on a
        // single day's matched pairs (excess lapses).
        $smallestMilestone = null;
        foreach ($milestones as $m) {
            if ((int) $m > 0) {
                $smallestMilestone = (int) $m;
                break;
            }
        }

        $lifetime = app(PanelMatchingService::class)->lifetimeSubPanelBuys($earner);
        $weakLeg = min($lifetime['left'], $lifetime['right']);

        $structureClosing = BinaryDailyClosing::latestForDisplay(
            $earner->id,
            BinaryDailyClosing::SCOPE_PANEL,
        );
        $firstPaidClosing = BinaryClosingDisplay::firstPaidInCurrentCycle(
            $earner->id,
            BinaryDailyClosing::SCOPE_PANEL,
        );
        $incomeLocked = BinaryClosingDisplay::incomeLockedInCurrentCycle(
            $earner->id,
            BinaryDailyClosing::SCOPE_PANEL,
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
        // Team "Lapsed today" = binary weak-leg lapse only (match min legs; strong keeps diff).
        $weakSide = $binaryWeak['side'] ?? BinaryWeakSideLapse::sideFromLifetime($lifetime['left'], $lifetime['right']);
        $weakLapsed = $binaryWeak['lapsed'];
        $milestoneMask = 0;
        foreach (array_values($milestones) as $idx => $m) {
            if ((int) $m > 0 && (int) $m === $paidMilestone) {
                $milestoneMask |= (1 << $idx);
                break;
            }
        }

        $carryL = (int) $earner->panel_match_carry_left;
        $carryR = (int) $earner->panel_match_carry_right;

        return [
            'eligible' => $earner->qualifiesForPanelMatchingIncome(),
            'carry_left' => $carryL,
            'carry_right' => $carryR,
            'pairs_available' => min($carryL, $carryR),
            'income_mode' => 'milestone_table',
            'daily_cap_usd' => $cap,
            'earned_today_usd' => $earned,
            'remaining_cap_usd' => $remaining,
            'total_left_subs' => $lifetime['left'],
            'total_right_subs' => $lifetime['right'],
            'weak_leg' => $weakLeg,
            'current_milestone' => $incomeLocked ? $paidMilestone : $applicableMilestone,
            'table_income_usd' => $incomeLocked
                ? BinaryClosingDisplay::lockedMilestonePaidUsd($firstPaidClosing)
                : (string) $applicableMilestone,
            'income_projection_locked' => $incomeLocked,
            'max_binary_pairs_per_day' => (int) config('binary_closing.scopes.panel.max_pairs_per_day', 20),
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
            'pair_carry_forward' => 0,
            'next_milestone' => $smallestMilestone,
            'pairs_until_next_milestone' => $smallestMilestone,
            'tier_rows' => $tiers,
            'rate' => (string) config('sub_panel_matching.rate'),
            'last_closing_date' => $structureClosing?->closing_date?->toDateString(),
        ];
    }
}

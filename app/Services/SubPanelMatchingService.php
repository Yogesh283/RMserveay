<?php

namespace App\Services;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Support\BinaryClosingCalendar;
use App\Support\BinaryClosingDisplay;
use App\Support\BinaryWeakSideLapse;
use App\Support\MatchingMilestoneTable;

/**
 * Sub-panel matching ($10 base) — tier-based payout with excess-lapse rule.
 *
 * Rule (daily closing):
 *   - Binary carry uses weak-leg match: min(left, right) up to 20/day; strong
 *     leg keeps only the diff, weak leg surplus lapses.
 *   - Milestone income: highest tier M in {2,4,8,…} where M <= today's matched
 *     pair count (nearest lower table row — e.g. 50 pairs → $32 tier, not $64).
 *   - Excess matched pairs above that tier lapse for milestone purposes.
 *   - No per-pair $1 stream in closing — only the milestone tier income is paid.
 */
class SubPanelMatchingService
{
    private function highestMilestoneFor(int $pairsMatched): int
    {
        return MatchingMilestoneTable::nearestTierAtOrBelow($pairsMatched, 'sub_panel_matching.milestones');
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
    public function applyMatchedPairs(User $earner, int $pairsToday, ?int $weakLegLifetime = null, ?string $closingDate = null): array
    {
        $pairsMatched = max(0, (int) $pairsToday);
        $earner->spm_pair_carry_forward = 0;

        $weakLeg = $weakLegLifetime !== null
            ? max(0, (int) $weakLegLifetime)
            : $pairsMatched;

        $result = [
            'milestone' => 0,
            'payout_usd' => '0.00',
            'pairs_today' => $pairsMatched,
            'weak_leg' => $weakLeg,
            'lapsed_pairs' => 0,
            'wallet_transaction_id' => null,
        ];

        if ($pairsMatched <= 0 || ! $earner->qualifiesForPanelMatchingIncome()) {
            return $result;
        }

        $highest = MatchingMilestoneTable::nearestTierAtOrBelow($pairsMatched, 'sub_panel_matching.milestones');

        if ($highest <= 0) {
            return $result;
        }

        $payout = MatchingMilestoneTable::payoutUsdForTier($highest, 'panel');

        $cap = (string) config('sub_panel_matching.daily_cap_usd', '256.00');
        $earnedToday = $this->earnedToday($earner->id);
        $remaining = bcsub($cap, $earnedToday, 2);
        if (bccomp($payout, $remaining, 2) > 0) {
            $payout = bccomp($remaining, '0.00', 2) > 0 ? $remaining : '0.00';
        }

        if (bccomp($payout, '0.00', 2) <= 0) {
            return $result;
        }

        $lapsed = MatchingMilestoneTable::milestoneLapsedPairs($pairsMatched, $highest);
        $newBalance = bcadd((string) $earner->wallet_balance, $payout, 2);
        $earner->wallet_balance = $newBalance;

        $tx = WalletTransaction::create([
            'user_id' => $earner->id,
            'type' => WalletTransaction::TYPE_SUB_PANEL_MATCHING,
            'amount' => $payout,
            'balance_after' => $newBalance,
            'meta' => array_filter([
                'source' => $closingDate !== null ? 'binary_daily_closing' : null,
                'closing_date' => $closingDate,
                'scope' => $closingDate !== null ? BinaryDailyClosing::SCOPE_PANEL : null,
                'milestone' => $highest,
                'pairs_today' => $pairsMatched,
                'weak_leg' => $weakLeg,
                'lapsed_pairs' => $lapsed,
                'rate' => (string) config('sub_panel_matching.rate', '0.10'),
            ], fn ($v) => $v !== null),
        ]);

        return [
            'milestone' => $highest,
            'payout_usd' => $payout,
            'pairs_today' => $pairsMatched,
            'weak_leg' => $weakLeg,
            'lapsed_pairs' => $lapsed,
            'wallet_transaction_id' => $tx->id,
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
            $tier = (int) $panels;
            $tiers[] = [
                'matching_panels' => $tier,
                'income_usd' => MatchingMilestoneTable::payoutUsdForTier($tier, 'panel'),
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
        $todayInputs = app(BinarySubtreeVolumeService::class)->closingMatchInputs(
            $earner,
            BinaryDailyClosing::SCOPE_PANEL,
            \Carbon\CarbonImmutable::parse(BinaryClosingCalendar::todayDateString(), BinaryClosingCalendar::timezone()),
        );
        $pairsForTier = min((int) $todayInputs['left_in'], (int) $todayInputs['right_in']);
        $maxPairs = (int) config('binary_closing.scopes.panel.max_pairs_per_day', 20);
        $applicableMilestone = $earner->qualifiesActivePanelistIncome()
            ? $this->highestMilestoneFor(min($pairsForTier, $maxPairs))
            : 0;
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

        $carryL = (int) $todayInputs['left_in'];
        $carryR = (int) $todayInputs['right_in'];

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

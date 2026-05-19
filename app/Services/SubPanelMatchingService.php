<?php

namespace App\Services;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Models\WalletTransaction;

/**
 * Sub-panel matching ($10 base) — tier-based payout with excess-lapse rule.
 *
 * Rule:
 *   - Each closing day, look at today's matched pairs only (counter does NOT
 *     carry across days).
 *   - Find the highest milestone M (from {2,4,8,16,32,64,128,256}) such that
 *     today_pairs >= M.
 *   - Pay the milestone value once: payout = $M (rate × M × $10 = M with rate=0.10).
 *   - Excess matched pairs (today_pairs - M) LAPSE — they do not roll over to
 *     the next day's counter.
 *   - No per-pair $1 stream — only the milestone tier income is paid.
 */
class SubPanelMatchingService
{
    public function earnedToday(int $userId): string
    {
        $sum = WalletTransaction::query()
            ->where('user_id', $userId)
            ->where('type', WalletTransaction::TYPE_SUB_PANEL_MATCHING)
            ->whereDate('created_at', now()->toDateString())
            ->sum('amount');

        return number_format((float) ($sum ?? 0), 2, '.', '');
    }

    /**
     * Pay the highest milestone reached by TODAY'S matched pairs only. Excess
     * pairs above the milestone lapse — they do not roll forward to the next
     * day. Mutates the user model in memory; caller saves.
     *
     * @return array{milestone:int, payout_usd:string, pairs_today:int, lapsed_pairs:int}
     */
    public function applyMatchedPairs(User $earner, int $pairsToday): array
    {
        $today = max(0, (int) $pairsToday);
        // Counter is reset every closing — milestones are evaluated on a single
        // day's matched pairs only (excess lapses).
        $earner->spm_pair_carry_forward = 0;

        $result = [
            'milestone' => 0,
            'payout_usd' => '0.00',
            'pairs_today' => $today,
            'lapsed_pairs' => $today,
        ];

        if ($today <= 0 || ! $earner->qualifiesForPanelMatchingIncome()) {
            return $result;
        }

        $milestones = (array) config('sub_panel_matching.milestones', []);
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
            // Pairs below the smallest milestone: lapse them all.
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

        $lapsed = max(0, $today - $highest);
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
                'lapsed_pairs' => $lapsed,
                'rate' => (string) config('sub_panel_matching.rate', '0.10'),
            ],
        ]);

        return [
            'milestone' => $highest,
            'payout_usd' => $payout,
            'pairs_today' => $today,
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

        /** Latest daily-closing row is the live source for matched pairs / paid milestone. */
        $todayClosing = BinaryDailyClosing::query()
            ->where('user_id', $earner->id)
            ->where('scope', BinaryDailyClosing::SCOPE_PANEL)
            ->whereDate('closing_date', now()->toDateString())
            ->latest('id')
            ->first();
        $todayMilestone = (int) ($todayClosing?->meta['milestone'] ?? 0);
        $milestoneMask = 0;
        foreach (array_values($milestones) as $idx => $m) {
            if ((int) $m > 0 && (int) $m === $todayMilestone) {
                $milestoneMask |= (1 << $idx);
                break;
            }
        }

        return [
            'eligible' => $earner->qualifiesForPanelMatchingIncome(),
            'daily_cap_usd' => $cap,
            'earned_today_usd' => $earned,
            'remaining_cap_usd' => $remaining,
            'cumulative_matched_panels_today' => (int) ($todayClosing?->pairs_matched ?? 0),
            'milestones_hit_mask' => $milestoneMask,
            'today_milestone_lapsed_pairs' => (int) ($todayClosing?->meta['milestone_lapsed_pairs'] ?? 0),
            'today_milestone_paid_usd' => (string) ($todayClosing?->meta['milestone_paid_usd'] ?? '0.00'),
            'pair_carry_forward' => 0,
            'next_milestone' => $smallestMilestone,
            'pairs_until_next_milestone' => $smallestMilestone,
            'tier_rows' => $tiers,
            'rate' => (string) config('sub_panel_matching.rate'),
        ];
    }
}

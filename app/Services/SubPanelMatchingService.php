<?php

namespace App\Services;

use App\Models\User;
use App\Models\WalletTransaction;

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
     * Call once per matched pair (same carry consumption as panel matching).
     * Pays tabular milestone income when cumulative matched panels today hits 2,4,8,…,256.
     */
    public function applyPairMilestone(User $earner): void
    {
        if (! $earner->qualifiesForPanelMatchingIncome()) {
            return;
        }

        $today = now()->toDateString();
        if ($earner->spm_match_day === null || ! now()->isSameDay($earner->spm_match_day)) {
            $earner->spm_match_day = now()->startOfDay();
            $earner->spm_cumulative_panels = 0;
            $earner->spm_milestone_mask = 0;
        }

        $earner->spm_cumulative_panels = min(65535, (int) $earner->spm_cumulative_panels + 2);
        $m = (int) $earner->spm_cumulative_panels;

        $milestones = config('sub_panel_matching.milestones');
        if (! in_array($m, $milestones, true)) {
            return;
        }

        $tierIndex = array_search($m, $milestones, true);
        if (! is_int($tierIndex)) {
            return;
        }
        $mask = (int) $earner->spm_milestone_mask;
        $bit = 1 << $tierIndex;

        if (($mask & $bit) !== 0) {
            return;
        }

        $cap = (string) config('sub_panel_matching.daily_cap_usd');
        $earned = $this->earnedToday($earner->id);
        $remaining = bcsub($cap, $earned, 2);
        if (bccomp($remaining, '0.00', 2) <= 0) {
            return;
        }

        $pay = (string) $m;
        $actual = bccomp($pay, $remaining, 2) <= 0 ? $pay : $remaining;

        if (bccomp($actual, '0.00', 2) <= 0) {
            return;
        }

        $newBalance = bcadd((string) $earner->wallet_balance, $actual, 2);
        $earner->wallet_balance = $newBalance;
        $earner->spm_milestone_mask = $mask | $bit;

        WalletTransaction::create([
            'user_id' => $earner->id,
            'type' => WalletTransaction::TYPE_SUB_PANEL_MATCHING,
            'amount' => $actual,
            'balance_after' => $newBalance,
            'meta' => [
                'cumulative_matched_panels' => $m,
                'milestone_panels' => $m,
                'tier_index' => $tierIndex,
                'intended_usd' => $pay,
                'capped' => bccomp($actual, $pay, 2) !== 0,
                'rate' => (string) config('sub_panel_matching.rate'),
            ],
        ]);
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

        return [
            'eligible' => $earner->qualifiesForPanelMatchingIncome(),
            'daily_cap_usd' => $cap,
            'earned_today_usd' => $earned,
            'remaining_cap_usd' => $remaining,
            'cumulative_matched_panels_today' => (int) ($earner->spm_match_day !== null && now()->isSameDay($earner->spm_match_day) ? $earner->spm_cumulative_panels : 0),
            'milestones_hit_mask' => (int) ($earner->spm_match_day !== null && now()->isSameDay($earner->spm_match_day) ? $earner->spm_milestone_mask : 0),
            'tier_rows' => $tiers,
            'rate' => (string) config('sub_panel_matching.rate'),
        ];
    }
}

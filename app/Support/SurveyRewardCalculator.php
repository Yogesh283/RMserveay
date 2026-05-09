<?php

namespace App\Support;

use App\Models\Survey;
use App\Models\User;

/**
 * Calculates the per-completion reward a member earns for a given publisher survey,
 * based on the survey tier and the member's panel ownership.
 *
 * Rules (from config/survey_completion_rewards.php):
 *  - free:        flat (default $0.01)
 *  - panel:       flat (default $1.00) — only if member is an active panelist
 *  - sub_panel:   $rate × member.sub_panel_count
 *  - super_panel: $rate × member.super_sub_panel_count
 */
class SurveyRewardCalculator
{
    /** @return string Bank-grade decimal string with 2 places (e.g. "4.00"). */
    public function rewardFor(User $user, Survey $survey): string
    {
        $tier = $this->normalizeTier($survey->member_tier);
        $cfg = (array) config('survey_completion_rewards', []);

        return match ($tier) {
            Survey::TIER_FREE => $this->money((string) ($cfg['free'] ?? '0.00')),

            Survey::TIER_PANEL => $user->qualifiesActivePanelistIncome()
                ? $this->money((string) ($cfg['panel'] ?? '0.00'))
                : '0.00',

            Survey::TIER_SUB_PANEL => $this->multiplyByCount(
                (string) ($cfg['sub_panel_per_active'] ?? '0.00'),
                (int) ($user->sub_panel_count ?? 0),
            ),

            Survey::TIER_SUPER_PANEL => $this->multiplyByCount(
                (string) ($cfg['super_panel_per_active'] ?? '0.00'),
                (int) ($user->super_sub_panel_count ?? 0),
            ),

            default => '0.00',
        };
    }

    public function eligible(User $user, Survey $survey): bool
    {
        $tier = $this->normalizeTier($survey->member_tier);

        return match ($tier) {
            Survey::TIER_FREE => true,
            Survey::TIER_PANEL => $user->qualifiesActivePanelistIncome(),
            Survey::TIER_SUB_PANEL => ((int) ($user->sub_panel_count ?? 0)) >= 1,
            Survey::TIER_SUPER_PANEL => ((int) ($user->super_sub_panel_count ?? 0)) >= 1,
            default => true,
        };
    }

    private function normalizeTier(?string $tier): string
    {
        $allowed = [
            Survey::TIER_FREE,
            Survey::TIER_PANEL,
            Survey::TIER_SUB_PANEL,
            Survey::TIER_SUPER_PANEL,
        ];
        $t = strtolower((string) $tier);

        return in_array($t, $allowed, true) ? $t : Survey::TIER_FREE;
    }

    private function multiplyByCount(string $rate, int $count): string
    {
        if ($count <= 0) {
            return '0.00';
        }

        return $this->money(bcmul($this->money($rate), (string) $count, 2));
    }

    private function money(string $value): string
    {
        if ($value === '' || ! is_numeric($value)) {
            return '0.00';
        }

        return bcadd($value, '0', 2);
    }
}

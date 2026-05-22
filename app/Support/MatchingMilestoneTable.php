<?php

namespace App\Support;

/**
 * Sub / Super milestone income: after binary pairs match, pay the highest table
 * tier that is still at or below matched pair count (nearest lower tier).
 *
 * Example: 50 pairs matched, tiers …32, 64… → tier 32 pays $32 (not 64).
 */
final class MatchingMilestoneTable
{
    /**
     * Highest milestone M in config where M <= $pairsMatched.
     */
    public static function nearestTierAtOrBelow(int $pairsMatched, string $milestonesConfigKey): int
    {
        $pairsMatched = max(0, $pairsMatched);
        if ($pairsMatched <= 0) {
            return 0;
        }

        $milestones = (array) config($milestonesConfigKey, []);
        rsort($milestones, SORT_NUMERIC);

        foreach ($milestones as $m) {
            $m = (int) $m;
            if ($m > 0 && $pairsMatched >= $m) {
                return $m;
            }
        }

        return 0;
    }

    public static function payoutUsdForTier(int $tier, string $scope): string
    {
        if ($tier <= 0) {
            return '0.00';
        }

        if ($scope === 'super') {
            return bcmul(
                (string) $tier,
                (string) config('super_sub_panel_matching.income_multiplier', '10'),
                2,
            );
        }

        return (string) $tier;
    }

    /** Matched pairs above the paid milestone tier (informational lapse). */
    public static function milestoneLapsedPairs(int $pairsMatched, int $paidTier): int
    {
        return max(0, $pairsMatched - max(0, $paidTier));
    }
}

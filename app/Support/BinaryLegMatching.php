<?php

namespace App\Support;

/**
 * Classical binary 1:1 leg math used on the member team page:
 *   pairs = min(left_volume, right_volume)
 *   carry_left  = left  - pairs  (strong-side leftover)
 *   carry_right = right - pairs  (weak side → 0 when right is weak)
 */
final class BinaryLegMatching
{
    /**
     * @return array{
     *     left_volume:int,
     *     right_volume:int,
     *     pairs_1_1:int,
     *     carry_left:int,
     *     carry_right:int,
     * }
     */
    public static function fromLegVolumes(int $leftVolume, int $rightVolume): array
    {
        $leftVolume = max(0, $leftVolume);
        $rightVolume = max(0, $rightVolume);
        $pairs = min($leftVolume, $rightVolume);

        return [
            'left_volume' => $leftVolume,
            'right_volume' => $rightVolume,
            'pairs_1_1' => $pairs,
            'carry_left' => $leftVolume - $pairs,
            'carry_right' => $rightVolume - $pairs,
        ];
    }

    /**
     * Highest milestone reached by a matched pair count (sub / super tables).
     *
     * @param  list<int|numeric-string>  $milestones
     */
    public static function highestMilestone(int $pairs, array $milestones): int
    {
        if ($pairs <= 0) {
            return 0;
        }

        $sorted = array_map('intval', $milestones);
        rsort($sorted, SORT_NUMERIC);

        foreach ($sorted as $m) {
            if ($m > 0 && $pairs >= $m) {
                return $m;
            }
        }

        return 0;
    }

    /**
     * @param  list<int|numeric-string>  $milestones
     * @return array{milestone:int, payout_usd:string, lapsed_pairs:int}
     */
    public static function milestoneSplit(int $pairs, array $milestones): array
    {
        $pairs = max(0, $pairs);
        $milestone = self::highestMilestone($pairs, $milestones);

        if ($milestone <= 0) {
            return [
                'milestone' => 0,
                'payout_usd' => '0.00',
                'lapsed_pairs' => $pairs,
            ];
        }

        return [
            'milestone' => $milestone,
            'payout_usd' => (string) $milestone,
            'lapsed_pairs' => max(0, $pairs - $milestone),
        ];
    }
}

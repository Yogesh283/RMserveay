<?php

namespace App\Support;

use App\Models\BinaryDailyClosing;

class BinaryWeakSideLapse
{
    /**
     * Lapse on the weaker leg at closing (from carry_in), per weak_lapse_strong_diff rule.
     *
     * @return array{side: ?string, lapsed: int}
     */
    public static function fromClosing(?BinaryDailyClosing $closing): array
    {
        if ($closing === null) {
            return ['side' => null, 'lapsed' => 0];
        }

        $leftIn = (int) $closing->left_carry_in;
        $rightIn = (int) $closing->right_carry_in;

        if ($leftIn <= $rightIn) {
            return ['side' => 'left', 'lapsed' => (int) $closing->left_lapsed];
        }

        return ['side' => 'right', 'lapsed' => (int) $closing->right_lapsed];
    }

    /** @return 'left'|'right' */
    public static function sideFromLifetime(int $left, int $right): string
    {
        return $left <= $right ? 'left' : 'right';
    }

    /**
     * weak_lapse_strong_diff — same math as BinaryDailyClosingService.
     *
     * @return array{
     *     left_out: int,
     *     right_out: int,
     *     weak_side: ?string,
     *     weak_lapsed: int,
     *     pairs_matched: int
     * }
     */
    public static function splitFromLegCounts(int $leftIn, int $rightIn, int $maxPairs): array
    {
        $leftIn = max(0, $leftIn);
        $rightIn = max(0, $rightIn);

        if ($leftIn <= 0 && $rightIn <= 0) {
            return [
                'left_out' => 0,
                'right_out' => 0,
                'weak_side' => null,
                'weak_lapsed' => 0,
                'pairs_matched' => 0,
            ];
        }

        $pairsMatched = min(min($leftIn, $rightIn), max(0, $maxPairs));
        $diff = abs($leftIn - $rightIn);

        if ($leftIn >= $rightIn) {
            $leftOut = $diff;
            $rightOut = 0;
        } else {
            $leftOut = 0;
            $rightOut = $diff;
        }

        $leftLapsed = max(0, $leftIn - $pairsMatched - $leftOut);
        $rightLapsed = max(0, $rightIn - $pairsMatched - $rightOut);
        $weakSide = $leftIn <= $rightIn ? 'left' : 'right';

        return [
            'left_out' => $leftOut,
            'right_out' => $rightOut,
            'weak_side' => $weakSide,
            'weak_lapsed' => $weakSide === 'left' ? $leftLapsed : $rightLapsed,
            'pairs_matched' => $pairsMatched,
        ];
    }
}

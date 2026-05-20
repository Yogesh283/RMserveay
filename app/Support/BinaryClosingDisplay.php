<?php

namespace App\Support;

use App\Models\BinaryDailyClosing;

/**
 * Member UI: income figures come from the first paid closing in the cycle;
 * carry / lapse structure comes from the latest closing (admin re-runs may refresh structure only).
 *
 * Does not alter binary:daily-closing calculation — display layer only.
 */
final class BinaryClosingDisplay
{
    public static function firstPaidInCurrentCycle(int $userId, string $scope): ?BinaryDailyClosing
    {
        return BinaryDailyClosing::query()
            ->where('user_id', $userId)
            ->where('scope', $scope)
            ->where('created_at', '>=', BinaryClosingCalendar::currentCycleStart())
            ->where('payout_usd', '>', 0)
            ->orderBy('id')
            ->first();
    }

    public static function incomeLockedInCurrentCycle(int $userId, string $scope): bool
    {
        return self::firstPaidInCurrentCycle($userId, $scope) !== null;
    }

    public static function lockedPayoutUsd(?BinaryDailyClosing $firstPaid): string
    {
        if ($firstPaid === null) {
            return '0.00';
        }

        return number_format((float) $firstPaid->payout_usd, 2, '.', '');
    }

    public static function lockedMilestonePaidUsd(?BinaryDailyClosing $firstPaid): string
    {
        if ($firstPaid === null) {
            return '0.00';
        }

        $meta = $firstPaid->meta ?? [];

        return (string) ($meta['milestone_paid_usd'] ?? '0.00');
    }

    public static function lockedMilestone(?BinaryDailyClosing $firstPaid): int
    {
        if ($firstPaid === null) {
            return 0;
        }

        return (int) ($firstPaid->meta['milestone'] ?? 0);
    }
}

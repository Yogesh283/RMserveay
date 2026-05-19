<?php

namespace App\Support;

use App\Models\BinaryDailyClosing;
use App\Models\WalletTransaction;

/**
 * Resolves “today” matching stats for member UI when income was credited via
 * wallet but the binary_daily_closings row is missing or incomplete.
 */
class MatchingTodayStats
{
    public static function todayClosing(int $userId, string $scope): ?BinaryDailyClosing
    {
        return BinaryDailyClosing::query()
            ->where('user_id', $userId)
            ->where('scope', $scope)
            ->whereDate('closing_date', now()->toDateString())
            ->latest('id')
            ->first();
    }

    public static function pairsMatchedToday(
        int $userId,
        string $closingScope,
        string $milestoneTxType,
        ?string $perPairTxType = null,
    ): int {
        $fromClosing = (int) (self::todayClosing($userId, $closingScope)?->pairs_matched ?? 0);

        $fromMilestone = (int) WalletTransaction::query()
            ->where('user_id', $userId)
            ->where('type', $milestoneTxType)
            ->whereDate('created_at', now()->toDateString())
            ->get()
            ->max(fn (WalletTransaction $t) => (int) ($t->meta['pairs_today'] ?? 0));

        $fromPerPair = 0;
        if ($perPairTxType !== null) {
            $fromPerPair = (int) WalletTransaction::query()
                ->where('user_id', $userId)
                ->where('type', $perPairTxType)
                ->whereDate('created_at', now()->toDateString())
                ->get()
                ->sum(fn (WalletTransaction $t) => (int) ($t->meta['pairs'] ?? 0));
        }

        return max($fromClosing, $fromMilestone, $fromPerPair);
    }

    public static function milestonePaidUsdDisplay(?BinaryDailyClosing $closing, string $earnedTodayUsd): string
    {
        $fromClosing = (string) ($closing?->meta['milestone_paid_usd'] ?? '0.00');
        if (bccomp($fromClosing, '0.00', 2) > 0) {
            return $fromClosing;
        }

        return $earnedTodayUsd;
    }

    public static function lapsedPairsToday(
        ?BinaryDailyClosing $closing,
        int $userId,
        string $milestoneTxType,
    ): int {
        $fromClosing = (int) ($closing?->meta['milestone_lapsed_pairs'] ?? 0);
        if ($fromClosing > 0) {
            return $fromClosing;
        }

        return (int) WalletTransaction::query()
            ->where('user_id', $userId)
            ->where('type', $milestoneTxType)
            ->whereDate('created_at', now()->toDateString())
            ->get()
            ->max(fn (WalletTransaction $t) => (int) ($t->meta['lapsed_pairs'] ?? 0));
    }
}

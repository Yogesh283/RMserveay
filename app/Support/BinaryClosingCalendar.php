<?php

namespace App\Support;

use App\Models\WalletTransaction;
use Illuminate\Support\Carbon;

/**
 * Calendar dates for binary daily closing (see config/binary_closing.php).
 * Default artisan closing is "yesterday" in the configured timezone.
 *
 * Matching "day" for members follows the closing-time cycle (e.g. 10:00 → 10:00),
 * not calendar midnight — so income projections hide after one closing per cycle.
 */
final class BinaryClosingCalendar
{
    public static function timezone(): string
    {
        return (string) config('binary_closing.timezone', 'Asia/Kolkata');
    }

    /** 24h "HH:MM" inside `timezone` when the closing job runs. */
    public static function closingTime(): string
    {
        return (string) config('binary_closing.closing_time', '08:00');
    }

    /** @return array{0: int, 1: int} hour, minute */
    public static function closingTimeParts(): array
    {
        $parts = explode(':', self::closingTime());
        $hour = isset($parts[0]) ? (int) $parts[0] : 8;
        $minute = isset($parts[1]) ? (int) $parts[1] : 0;

        return [$hour, $minute];
    }

    public static function now(): Carbon
    {
        return Carbon::now(self::timezone());
    }

    /**
     * Start of the current accrual cycle: last closing_time boundary at or before now.
     * Example closing 10:00 — on May 20 09:00 cycle starts May 19 10:00; on May 20 11:00 → May 20 10:00.
     */
    public static function currentCycleStart(): Carbon
    {
        $now = self::now();
        [$hour, $minute] = self::closingTimeParts();
        $boundary = $now->copy()->startOfDay()->setTime($hour, $minute, 0);

        if ($now->lt($boundary)) {
            return $boundary->copy()->subDay();
        }

        return $boundary;
    }

    public static function currentCycleEnd(): Carbon
    {
        return self::currentCycleStart()->copy()->addDay();
    }

    /**
     * `closing_date` processed when the current cycle ends (same calendar day as cycle start).
     */
    public static function pendingClosingDateForCurrentCycle(): string
    {
        return self::currentCycleStart()->toDateString();
    }

    public static function today(): Carbon
    {
        return self::now()->startOfDay();
    }

    public static function yesterday(): Carbon
    {
        return self::today()->copy()->subDay();
    }

    public static function todayDateString(): string
    {
        return self::today()->toDateString();
    }

    public static function yesterdayDateString(): string
    {
        return self::yesterday()->toDateString();
    }

    /**
     * Start/end of "today" in closing TZ for DB datetime range queries.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    public static function todayLocalBounds(): array
    {
        $start = self::now()->startOfDay();
        $end = self::now()->endOfDay();

        return [$start, $end];
    }

    /**
     * Start/end of a calendar closing_date in the configured timezone (00:00:00 → 23:59:59).
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    public static function dateLocalBounds(string $dateYmd): array
    {
        $start = Carbon::parse($dateYmd, self::timezone())->startOfDay();
        $end = $start->copy()->endOfDay();

        return [$start, $end];
    }

    /**
     * Sum positive wallet credits since the current closing cycle began.
     *
     * @param  string|list<string>  $types
     */
    public static function sumWalletCreditsSinceCycleStart(int $userId, string|array $types): string
    {
        $types = is_array($types) ? $types : [$types];
        $since = self::currentCycleStart();

        $sum = WalletTransaction::query()
            ->where('user_id', $userId)
            ->whereIn('type', $types)
            ->where('created_at', '>=', $since)
            ->sum('amount');

        return number_format((float) ($sum ?? 0), 2, '.', '');
    }
}

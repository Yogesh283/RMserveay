<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/**
 * Calendar dates for binary daily closing (see config/binary_closing.php).
 * Default artisan closing is "yesterday" in the configured timezone.
 */
final class BinaryClosingCalendar
{
    public static function timezone(): string
    {
        return (string) config('binary_closing.timezone', 'Asia/Kolkata');
    }

    public static function today(): Carbon
    {
        return Carbon::now(self::timezone())->startOfDay();
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
        $start = Carbon::now(self::timezone())->startOfDay();
        $end = Carbon::now(self::timezone())->endOfDay();

        return [$start, $end];
    }
}

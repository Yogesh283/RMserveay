<?php

namespace App\Support;

use Illuminate\Http\Request;

class SessionAuthStamp
{
    public const SESSION_KEY = 'app_authenticated_at';

    public static function stamp(Request $request): void
    {
        if ($request->hasSession()) {
            $request->session()->put(self::SESSION_KEY, now()->timestamp);
        }
    }

    public static function clear(Request $request): void
    {
        if ($request->hasSession()) {
            $request->session()->forget(self::SESSION_KEY);
        }
    }

    public static function maxAgeSeconds(): int
    {
        $minutes = (int) config('auth_session.max_minutes', 1440);

        return max(1, $minutes) * 60;
    }

    public static function isExpired(Request $request): bool
    {
        if (! $request->hasSession()) {
            return false;
        }

        $loggedInAt = $request->session()->get(self::SESSION_KEY);
        if ($loggedInAt === null || ! is_numeric($loggedInAt)) {
            return false;
        }

        return (now()->timestamp - (int) $loggedInAt) > self::maxAgeSeconds();
    }
}

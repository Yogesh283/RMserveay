<?php

namespace App\Http\Controllers\Cron;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

/**
 * URL-based cron entry point for the binary daily-closing job.
 *
 * Designed for shared-hosting setups that can only ping a URL (e.g. cPanel
 * cron jobs that wget/curl a URL, or external services like cron-job.org).
 *
 * Authentication: require a token configured via `CRON_TOKEN` in .env.
 * Pass it as `?token=...` query param or as an `X-Cron-Token` header.
 *
 * Examples:
 *   GET  https://your-domain.com/cron/binary-daily-closing?token=YOUR_TOKEN
 *   GET  https://your-domain.com/cron/binary-daily-closing?token=YOUR_TOKEN&date=2026-05-20
 *   (no `date` param = yesterday; `date=today` is treated as yesterday)
 */
class BinaryDailyClosingCronController extends Controller
{
    public function run(Request $request): JsonResponse
    {
        $expected = (string) config('services.cron.token', env('CRON_TOKEN', ''));
        if ($expected === '') {
            return response()->json([
                'ok' => false,
                'error' => 'CRON_TOKEN is not configured on the server.',
            ], 503);
        }

        $token = (string) ($request->query('token', $request->header('X-Cron-Token', '')));
        if (! hash_equals($expected, $token)) {
            return response()->json([
                'ok' => false,
                'error' => 'Invalid cron token.',
            ], 401);
        }

        $params = [];
        $date = (string) $request->query('date', '');
        if ($date !== '') {
            $params['--date'] = $date;
        }
        $scope = $request->query('scope');
        if ($scope !== null && $scope !== '') {
            $params['--scope'] = is_array($scope) ? array_values($scope) : [(string) $scope];
        }
        if ($request->boolean('report')) {
            $params['--report'] = true;
        }

        $start = microtime(true);
        $exitCode = Artisan::call('binary:daily-closing', $params);
        $elapsedMs = (int) round((microtime(true) - $start) * 1000);
        $output = trim(Artisan::output());

        return response()->json([
            'ok' => $exitCode === 0,
            'command' => 'binary:daily-closing',
            'params' => $params,
            'exit_code' => $exitCode,
            'elapsed_ms' => $elapsedMs,
            'output' => $output,
        ]);
    }
}

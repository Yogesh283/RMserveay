<?php

namespace App\Http\Controllers\Cron;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

/**
 * URL-based cron entry point for the hourly respondent payout job.
 *
 * Auth: requires the same `CRON_TOKEN` as the other URL crons. Pass via
 * `?token=...` or `X-Cron-Token` header.
 *
 * Examples:
 *   GET https://your-domain.com/cron/surveys-pay-respondent-payouts?token=YOUR_TOKEN
 */
class RespondentPayoutsCronController extends Controller
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

        $start = microtime(true);
        $exitCode = Artisan::call('surveys:pay-respondent-payouts');
        $elapsedMs = (int) round((microtime(true) - $start) * 1000);
        $output = trim(Artisan::output());

        return response()->json([
            'ok' => $exitCode === 0,
            'command' => 'surveys:pay-respondent-payouts',
            'exit_code' => $exitCode,
            'elapsed_ms' => $elapsedMs,
            'output' => $output !== '' ? $output : 'No payouts due.',
        ]);
    }
}

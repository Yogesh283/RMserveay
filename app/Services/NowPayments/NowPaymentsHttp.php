<?php

namespace App\Services\NowPayments;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * Shared HTTP defaults for NOWPayments (slow networks often hit 10s connect limit without connectTimeout).
 */
final class NowPaymentsHttp
{
    public static function pending(): PendingRequest
    {
        $connect = max(15, (int) config('nowpayments.http_connect_timeout', 60));
        $timeout = max($connect + 15, (int) config('nowpayments.http_timeout', 120));

        $pending = Http::acceptJson()
            ->connectTimeout($connect)
            ->timeout($timeout)
            ->retry(
                max(1, (int) config('nowpayments.http_retries', 3)),
                max(500, (int) config('nowpayments.http_retry_delay_ms', 2000)),
                static fn (\Throwable $e): bool => $e instanceof ConnectionException,
                throw: false,
            );

        if ((bool) config('nowpayments.http_ipv4', true)) {
            $pending = $pending->withOptions([
                'curl' => [
                    CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
                ],
            ]);
        }

        return $pending;
    }
}

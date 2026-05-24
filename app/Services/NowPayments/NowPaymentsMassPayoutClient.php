<?php

namespace App\Services\NowPayments;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

/**
 * NOWPayments Mass Payout API (same host as payments: /auth, /payout, /balance).
 *
 * @see https://documenter.getpostman.com/view/7907941/T1DtdF9a
 */
class NowPaymentsMassPayoutClient
{
    public function __construct(
        protected string $baseUrl,
        protected string $apiKey,
        protected string $email,
        protected string $password,
    ) {}

    public function isConfigured(): bool
    {
        return $this->apiKey !== '' && $this->email !== '' && $this->password !== '';
    }

    /**
     * @return array<string, mixed>
     */
    public function authenticate(bool $forceRefresh = false): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('NOWPayments payout credentials are not configured (API key, email, password).');
        }

        $cacheKey = 'nowpayments.mass_payout_bearer_token';

        if (! $forceRefresh) {
            $cached = Cache::get($cacheKey);
            if (is_string($cached) && $cached !== '') {
                return ['token' => $cached];
            }
        }

        $response = $this->request('POST', '/auth', [
            'email' => $this->email,
            'password' => $this->password,
        ]);

        if (! $response->successful()) {
            throw new RuntimeException($this->friendlyError(
                $this->errorMessage($response, 'NOWPayments authentication failed.'),
            ));
        }

        /** @var array<string, mixed> $body */
        $body = $response->json();
        $token = isset($body['token']) ? (string) $body['token'] : '';

        if ($token === '') {
            throw new RuntimeException('NOWPayments auth response did not include a token.');
        }

        Cache::put($cacheKey, $token, now()->addMinutes(50));

        return $body;
    }

    /**
     * Nested withdrawals payload required by NOWPayments (see Technical FAQ).
     *
     * @param  array<int, array<string, mixed>>  $batchItems
     * @return array<string, mixed>
     */
    public function createPayout(array $batchItems): array
    {
        $token = $this->authenticate()['token'] ?? '';
        if (! is_string($token) || $token === '') {
            throw new RuntimeException('Missing NOWPayments bearer token.');
        }

        $response = $this->request('POST', '/payout', [
            'withdrawals' => $batchItems,
        ], $token);

        if (! $response->successful()) {
            throw new RuntimeException($this->friendlyError(
                $this->errorMessage($response, 'NOWPayments payout creation failed.'),
            ));
        }

        /** @var array<string, mixed> */
        return $response->json();
    }

    /**
     * @return array<string, mixed>
     */
    public function verifyPayout(string $payoutId, string $verificationCode): array
    {
        $token = $this->authenticate()['token'] ?? '';
        $code = trim($verificationCode);

        $attempts = [
            ['POST', '/payout/'.$payoutId.'/verify', ['verification_code' => $code]],
            ['POST', '/verify/payout', ['payout_id' => $payoutId, 'verification_code' => $code]],
            ['POST', '/payout/verify', ['payout_id' => $payoutId, 'verification_code' => $code]],
        ];

        $lastResponse = null;
        foreach ($attempts as [$method, $path, $body]) {
            $response = $this->request($method, $path, $body, is_string($token) ? $token : null);
            $lastResponse = $response;
            if ($response->successful()) {
                /** @var array<string, mixed> */
                return $response->json();
            }
        }

        throw new RuntimeException($this->errorMessage(
            $lastResponse ?? throw new RuntimeException('No verify response.'),
            'NOWPayments payout verification failed.',
        ));
    }

    /**
     * @return array<string, mixed>
     */
    public function getPayout(string $payoutId): array
    {
        $response = $this->request('GET', '/payout/'.$payoutId);

        if (! $response->successful()) {
            throw new RuntimeException($this->errorMessage($response, 'NOWPayments payout status failed.'));
        }

        /** @var array<string, mixed> */
        return $response->json();
    }

    /**
     * @return array<string, mixed>
     */
    public function getBalance(): array
    {
        $token = $this->authenticate()['token'] ?? '';

        $response = $this->request('GET', '/balance', null, is_string($token) ? $token : null);

        if (! $response->successful()) {
            throw new RuntimeException($this->errorMessage($response, 'NOWPayments balance request failed.'));
        }

        /** @var array<string, mixed> */
        return $response->json();
    }

    /**
     * @param  array<string, mixed>|null  $body
     */
    protected function request(string $method, string $path, ?array $body = null, ?string $bearerToken = null): Response
    {
        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];

        // POST /auth only needs email+password (NOWPayments docs); other routes need the API key.
        if ($path !== '/auth') {
            if ($this->apiKey === '') {
                throw new RuntimeException('NOWPayments API key is not configured.');
            }
            $headers['x-api-key'] = $this->apiKey;
        }

        if ($bearerToken !== null && $bearerToken !== '') {
            $headers['Authorization'] = 'Bearer '.$bearerToken;
        }

        $url = rtrim($this->baseUrl, '/').$path;

        $pending = NowPaymentsHttp::pending()->withHeaders($headers);

        return match (strtoupper($method)) {
            'GET' => $pending->get($url),
            'POST' => $pending->post($url, $body ?? []),
            default => throw new RuntimeException('Unsupported HTTP method: '.$method),
        };
    }

    protected function errorMessage(Response $response, string $fallback): string
    {
        $json = $response->json();
        if (is_array($json)) {
            $msg = $json['message'] ?? $json['error'] ?? null;
            if (is_string($msg) && $msg !== '') {
                return $msg;
            }
        }

        $body = trim($response->body());
        if ($body !== '') {
            return $fallback.' HTTP '.$response->status().': '.mb_substr($body, 0, 500);
        }

        return $fallback.' HTTP '.$response->status();
    }

    protected function friendlyError(string $msg): string
    {
        $lower = strtolower($msg);

        if (str_contains($lower, 'invalid ip')) {
            $ip = 'your server public IP';
            if (preg_match('/invalid ip\s*[-–]?\s*([\d.a-f:]+)/i', $msg, $m)) {
                $ip = trim($m[1]);
            }

            return 'NOWPayments IP whitelist: your server public IP '.$ip.' is not allowed. '
                .'In https://account.nowpayments.io open Settings → IP whitelist (or Security) and add '.$ip.'. '
                .'Whitelist the live server IP too if payouts run on production (rmsurveyai.com).';
        }

        if (str_contains($lower, 'incorrect login')) {
            return 'NOWPayments login failed (email/password in .env do not match your dashboard account at account.nowpayments.io). '
                .'Use the exact registration email (case-sensitive) and master-account password.';
        }

        return $msg;
    }
}

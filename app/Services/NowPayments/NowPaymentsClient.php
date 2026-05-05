<?php

namespace App\Services\NowPayments;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class NowPaymentsClient
{
    public function __construct(
        protected string $baseUrl,
        protected string $apiKey,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function post(string $path, array $payload = []): Response
    {
        if ($this->apiKey === '') {
            throw new RuntimeException('NOWPayments API key is not configured.');
        }

        return Http::withHeaders([
            'x-api-key' => $this->apiKey,
            'Content-Type' => 'application/json',
        ])->timeout(30)->post($this->baseUrl.$path, $payload);
    }

    public function get(string $path): Response
    {
        if ($this->apiKey === '') {
            throw new RuntimeException('NOWPayments API key is not configured.');
        }

        return Http::withHeaders([
            'x-api-key' => $this->apiKey,
        ])->timeout(30)->get($this->baseUrl.$path);
    }
}

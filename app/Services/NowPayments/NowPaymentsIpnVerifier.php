<?php

namespace App\Services\NowPayments;

final class NowPaymentsIpnVerifier
{
    /**
     * @param  array<string, mixed>  $data
     */
    public static function recursiveKsort(array &$data): void
    {
        ksort($data);
        foreach ($data as &$value) {
            if (is_array($value)) {
                self::recursiveKsort($value);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function signature(array $data, string $ipnSecret): string
    {
        self::recursiveKsort($data);

        return hash_hmac('sha512', json_encode($data, JSON_UNESCAPED_SLASHES), trim($ipnSecret));
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function isValid(array $data, ?string $receivedSig, string $ipnSecret): bool
    {
        if ($receivedSig === null || $receivedSig === '' || $ipnSecret === '') {
            return false;
        }

        return hash_equals(self::signature($data, $ipnSecret), $receivedSig);
    }
}

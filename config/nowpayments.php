<?php

$treasury = trim((string) env('WALLET_TREASURY_BEP20', ''));
$zeroAddr = '0x0000000000000000000000000000000000000000';
$payoutAddr = trim((string) env('NOWPAYMENTS_PAYOUT_ADDRESS', ''));
if ($payoutAddr === '') {
    $payoutAddr = $treasury;
}
if ($payoutAddr !== '' && strtolower($payoutAddr) === strtolower($zeroAddr)) {
    $payoutAddr = '';
}

$creditStatuses = array_values(array_filter(array_map(
    static fn (string $s): string => strtolower(trim($s)),
    explode(',', (string) env('NOWPAYMENTS_CREDIT_STATUSES', 'finished,confirmed')),
)));

$allowedPay = array_values(array_filter(array_map(
    static fn (string $s): string => strtolower(trim($s)),
    explode(',', (string) env('NOWPAYMENTS_ALLOWED_PAY_CURRENCIES', (string) env('NOWPAYMENTS_PAY_CURRENCY', 'usdtbsc'))),
)));

return [
    /** OFF until env toggle + API key + IPN secret are all set (safe for local). */
    'enabled' => (bool) env('NOWPAYMENTS_ENABLED', false)
        && trim((string) env('NOWPAYMENTS_API_KEY', '')) !== ''
        && trim((string) env('NOWPAYMENTS_IPN_SECRET', '')) !== '',
    'api_key' => env('NOWPAYMENTS_API_KEY', ''),
    'ipn_secret' => env('NOWPAYMENTS_IPN_SECRET', ''),
    'base_url' => rtrim((string) env('NOWPAYMENTS_API_URL', 'https://api.nowpayments.io/v1'), '/'),
    /** USDT on BSC — see NOWPayments currency list */
    'pay_currency' => env('NOWPAYMENTS_PAY_CURRENCY', 'usdtbsc'),

    /**
     * Settlement wallet on NOWPayments (same network as payout_currency).
     * Defaults to WALLET_TREASURY_BEP20 when NOWPAYMENTS_PAYOUT_ADDRESS is empty.
     * Sent as create_payment `payout_address` so NP settles here (still configure dashboard payout wallet).
     */
    'payout_address' => $payoutAddr,

    /** Required by NP when payout_address is set (e.g. usdtbsc). */
    'payout_currency' => trim((string) env('NOWPAYMENTS_PAYOUT_CURRENCY', '')),
    /**
     * Ledger credit once first matching IPN/status poll hits any of these (comma-separated).
     * NP flow often stays on `confirmed` / `sending` before `finished`; IPNs may never reach localhost.
     */
    'credit_statuses' => $creditStatuses !== [] ? $creditStatuses : ['finished'],

    /** Pay currencies the member UI may offer (NOWPayments tickers). */
    'allowed_pay_currencies' => $allowedPay !== [] ? $allowedPay : ['usdtbsc'],

    /**
     * Mass payouts (member withdrawals → user BEP20 via NOWPayments).
     * Requires Custody + API key + account email/password (POST /auth) + IPN secret.
     * Whitelist server IP and destination wallets in NOWPayments dashboard.
     */
    'payouts' => [
        'enabled' => (bool) env('NOWPAYMENTS_PAYOUTS_ENABLED', false)
            && trim((string) env('NOWPAYMENTS_API_KEY', '')) !== ''
            && trim((string) env('NOWPAYMENTS_PAYOUT_EMAIL', '')) !== ''
            && trim((string) env('NOWPAYMENTS_PAYOUT_PASSWORD', '')) !== ''
            && trim((string) env('NOWPAYMENTS_IPN_SECRET', '')) !== '',
        'email' => env('NOWPAYMENTS_PAYOUT_EMAIL', ''),
        'password' => env('NOWPAYMENTS_PAYOUT_PASSWORD', ''),
        /** Payout currency ticker (USDT BEP20). */
        'currency' => strtolower(trim((string) env('NOWPAYMENTS_PAYOUT_CURRENCY', env('NOWPAYMENTS_PAY_CURRENCY', 'usdtbsc')))),
    ],
];

<?php

/**
 * Default sign-up wallet credit.
 *
 * Disabled by default — every brand-new user starts with a zero
 * `wallet_balance`. Re-enable per environment by setting
 * `SIGNUP_WALLET_BONUS_ENABLED=true` and `SIGNUP_WALLET_BONUS_USD=...`
 * in `.env`. When enabled, the credit is recorded in `wallet_transactions`
 * with type `signup_bonus` so it can be audited / reversed.
 */
return [
    'enabled' => filter_var(env('SIGNUP_WALLET_BONUS_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
    'amount_usd' => env('SIGNUP_WALLET_BONUS_USD', '0.00'),
];

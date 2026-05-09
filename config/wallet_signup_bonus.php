<?php

/**
 * Default sign-up wallet credit.
 *
 * Every brand-new user is credited with `amount_usd` to their main
 * `wallet_balance` immediately after registration. The credit is
 * recorded in `wallet_transactions` with type `signup_bonus` so it
 * can be audited / reversed.
 *
 * To disable, set `SIGNUP_WALLET_BONUS_ENABLED=false` in .env.
 * To change the amount, set `SIGNUP_WALLET_BONUS_USD=500.00` (etc.).
 */
return [
    'enabled' => filter_var(env('SIGNUP_WALLET_BONUS_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
    'amount_usd' => env('SIGNUP_WALLET_BONUS_USD', '1000.00'),
];

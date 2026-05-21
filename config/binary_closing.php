<?php

/**
 * Binary daily-closing configuration.
 *
 * The closing job runs once per day at `closing_time` in `timezone`.
 * For each user with a non-zero left/right carry it:
 *   - matches up to `max_pairs_per_day` pairs (1 left + 1 right = 1 pair),
 *   - active_panel scope: credits `pair_income_usd` per matched pair,
 *   - panel/super scopes: pays the highest milestone tier reached by today's
 *     matched pairs only — excess matched pairs above that milestone LAPSE
 *     (counter does NOT roll across days),
 *   - deducts matched pairs from BOTH legs,
 *   - carries forward any unmatched leftover on either leg (cap-induced or
 *     weak-leg leftover) to next day,
 *   - persists a row in `binary_daily_closings` for audit/reporting.
 *
 * All values are admin-configurable via the .env file (see keys below).
 */
return [

    /** Master switch. When false, the cron will exit without doing any work. */
    'enabled' => filter_var(env('BINARY_CLOSING_ENABLED', true), FILTER_VALIDATE_BOOLEAN),

    /**
     * When true (default), closing matches only carry that accrued on `closing_date`
     * (from wallet purchase events that day — e.g. 21 May run for 20 May uses 20 May only).
     * When false, uses cumulative carry columns on the user row (legacy).
     */
    'use_daily_carry_ledger' => filter_var(env('BINARY_CLOSING_USE_DAILY_LEDGER', true), FILTER_VALIDATE_BOOLEAN),

    /** IANA timezone for the daily cut-off. Default: India Standard Time. */
    'timezone' => env('BINARY_CLOSING_TIMEZONE', 'Asia/Kolkata'),

    /** 24h "HH:MM" inside `timezone` when the closing must run. Default: 08:00 IST. */
    'closing_time' => env('BINARY_CLOSING_TIME', '08:00'),

    /** Maximum pairs that can match for a single user in one closing. */
    'max_pairs_per_day' => (int) env('BINARY_CLOSING_MAX_PAIRS_PER_DAY', 20),

    /** USD credited per matched pair (Rule 12: admin can configure pair income). */
    'pair_income_usd' => env('BINARY_CLOSING_PAIR_INCOME_USD', '1.00'),

    /**
     * Which carry buckets the closing should process.
     *  - 'active_panel' → uses active_panel_match_carry_left / right (fed when a downline
     *     pays their $10 minimum panel fee — the second leg of the $11 active-panel flow).
     *  - 'panel'        → uses panel_match_carry_left / right (sub-panel $10 binary).
     *  - 'super'        → uses super_panel_match_carry_left / right (super-sub-panel $100 binary).
     */
    /**
     * lapse_strategy values:
     *  - 'weak_lapse_strong_diff' (Active Panel rule):
     *      pairs_matched = min(weak, max_pairs_per_day)
     *      strong_carry  = strong - weak     (diff only)
     *      weak_carry    = 0                 (weak fully consumed)
     *      lapse on each side = side_in - matched - side_carry
     *
     *  - 'no_lapse_both_carry' (Sub / Super rule):
     *      pairs_matched = min(weak, max_pairs_per_day)
     *      left_carry    = left  - matched  (full leftover carries)
     *      right_carry   = right - matched  (full leftover carries)
     *      no binary-side lapse; milestone-side lapse handled inside
     *      Sub/SuperSubPanelMatchingService::applyMatchedPairs.
     */
    'scopes' => [
        'active_panel' => [
            'enabled' => filter_var(env('BINARY_CLOSING_ACTIVE_PANEL_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
            'left_column' => 'active_panel_match_carry_left',
            'right_column' => 'active_panel_match_carry_right',
            'wallet_tx_type' => \App\Models\WalletTransaction::TYPE_ACTIVE_PANEL_MATCHING,
            'pair_income_usd' => env('BINARY_CLOSING_ACTIVE_PANEL_PAIR_INCOME_USD', '1.00'),
            'max_pairs_per_day' => (int) env('BINARY_CLOSING_ACTIVE_PANEL_MAX_PAIRS_PER_DAY', 20),
            // Classical binary MLM rule: weak leg fully consumed (any
            // unmatched weak-leg pairs LAPSE), strong leg carries only the
            // diff = strong - weak; the matched-but-uncoverable surplus on
            // strong (when cap kicks in) also LAPSES.
            'lapse_strategy' => env('BINARY_CLOSING_ACTIVE_PANEL_LAPSE_STRATEGY', 'weak_lapse_strong_diff'),
        ],
        'panel' => [
            'enabled' => filter_var(env('BINARY_CLOSING_PANEL_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
            'left_column' => 'panel_match_carry_left',
            'right_column' => 'panel_match_carry_right',
            'wallet_tx_type' => \App\Models\WalletTransaction::TYPE_PANEL_MATCHING,
            // Per-pair stream is disabled for sub-panel scope — only the
            // tier-based milestone is paid (see
            // SubPanelMatchingService::applyMatchedPairs). Excess matched
            // pairs above the highest reached milestone LAPSE same day.
            'pair_income_usd' => env('BINARY_CLOSING_PAIR_INCOME_USD', '0.00'),
            // 20 pairs/day binary match cap; unmatched leg leftover carries.
            'max_pairs_per_day' => (int) env('BINARY_CLOSING_MAX_PAIRS_PER_DAY', 20),
            'lapse_strategy' => env('BINARY_CLOSING_PANEL_LAPSE_STRATEGY', 'weak_lapse_strong_diff'),
        ],
        'super' => [
            'enabled' => filter_var(env('BINARY_CLOSING_SUPER_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
            'left_column' => 'super_panel_match_carry_left',
            'right_column' => 'super_panel_match_carry_right',
            'wallet_tx_type' => \App\Models\WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING,
            // Per-pair stream is disabled for super-sub scope — only the
            // tier-based milestone (× 10 multiplier) is paid. Excess matched
            // pairs above the highest reached milestone LAPSE same day.
            'pair_income_usd' => env('BINARY_CLOSING_SUPER_PAIR_INCOME_USD', '0.00'),
            'max_pairs_per_day' => (int) env('BINARY_CLOSING_SUPER_MAX_PAIRS_PER_DAY', 20),
            'lapse_strategy' => env('BINARY_CLOSING_SUPER_LAPSE_STRATEGY', 'weak_lapse_strong_diff'),
        ],
    ],

];

<?php

/**
 * Per-completion reward (USD) for publisher surveys, by tier.
 *
 * - Free survey:        flat amount per completion (any member)
 * - Active panel:       flat amount, only if the member qualifies as an
 *                       active panelist ($1 activation + $10 panel paid)
 * - Sub panel:          per-active-panel amount; total = rate × user.sub_panel_count
 * - Super sub panel:    per-active-panel amount; total = rate × user.super_sub_panel_count
 *
 * Override any value via .env without touching code.
 */
return [
    'free' => env('SURVEY_REWARD_FREE_USD', '0.20'),
    'panel' => env('SURVEY_REWARD_PANEL_USD', '1.00'),
    'sub_panel_per_active' => env('SURVEY_REWARD_SUB_PANEL_PER_ACTIVE_USD', '1.00'),
    'super_panel_per_active' => env('SURVEY_REWARD_SUPER_PANEL_PER_ACTIVE_USD', '10.00'),
];

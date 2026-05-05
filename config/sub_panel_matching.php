<?php

/**
 * Tabular sub-panel matching — milestone payouts when cumulative matched panels (per day) hit 2,4,8,…,256.
 * Income per milestone equals the milestone value ($2 at 2 panels, …, $256 at 256 panels).
 * Total payout from this stream capped per calendar day.
 */
return [

    'daily_cap_usd' => env('SUB_PANEL_MATCHING_DAILY_CAP_USD', '256.00'),

    /** Cumulative matched panel count milestones (each pair adds +2). */
    'milestones' => [2, 4, 8, 16, 32, 64, 128, 256],

    'rate' => env('SUB_PANEL_MATCHING_RATE', '0.10'),

];

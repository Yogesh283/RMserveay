<?php

/**
 * Super sub-panel tabular matching — $100 tier; milestone income = milestone × income_multiplier (default 10× sub-panel table).
 */
return [

    'daily_cap_usd' => env('SUPER_SUB_PANEL_MATCHING_DAILY_CAP_USD', '2560.00'),

    'milestones' => [2, 4, 8, 16, 32, 64, 128, 256],

    /** Income USD at milestone M panels = M × multiplier (e.g. 2→$20, 256→$2560). */
    'income_multiplier' => env('SUPER_SUB_PANEL_MATCHING_INCOME_MULTIPLIER', '10'),

    'rate' => env('SUPER_SUB_PANEL_MATCHING_RATE', '0.10'),

];

<?php

/**
 * Panel matching — $10 sub panels, 1:1 left vs right (direct binary legs),
 * 10% commission on the $10 panel base per pair (=$1 at default rate), max pairs/day cap.
 */
return [

    'rate' => env('PANEL_MATCHING_RATE', '0.10'),

    /** USD base per pair for the 10% commission (one $10 panel side; income = rate × this = $1.00 default). */
    'pair_volume_usd' => env('PANEL_MATCHING_PAIR_VOLUME_USD', '10.00'),

    'max_pairs_per_day' => (int) env('PANEL_MATCHING_MAX_PAIRS_PER_DAY', 20),

];

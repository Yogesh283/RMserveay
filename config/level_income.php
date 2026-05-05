<?php

/**
 * Survey level income — 1% of each downline survey credit per sponsor generation, max depth.
 */
return [

    'max_levels' => (int) env('LEVEL_INCOME_MAX_LEVELS', 10),

    'rate_per_level' => env('LEVEL_INCOME_RATE_PER_LEVEL', '0.01'),

];

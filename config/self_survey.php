<?php

/**
 * RM Survey — self survey income (USD). Rates match member documentation.
 */
return [

    'panelist_per_survey' => env('SELF_SURVEY_PANELIST_USD', '0.01'),

    'activation_fee' => env('SELF_SURVEY_ACTIVATION_FEE_USD', '1.00'),

    'minimum_panel_fee' => env('SELF_SURVEY_MIN_PANEL_FEE_USD', '10.00'),

    'active_panelist_per_survey' => env('SELF_SURVEY_ACTIVE_USD', '1.00'),

    'sub_panel_entry_fee' => env('SELF_SURVEY_SUB_PANEL_FEE_USD', '10.00'),

    'sub_panel_per_survey_each' => env('SELF_SURVEY_SUB_PER_SURVEY_USD', '1.00'),

    'super_sub_panel_entry_fee' => env('SELF_SURVEY_SUPER_SUB_FEE_USD', '100.00'),

    'super_sub_panel_per_survey_each' => env('SELF_SURVEY_SUPER_SUB_PER_SURVEY_USD', '100.00'),

    'max_sub_panels' => (int) env('SELF_SURVEY_MAX_SUB_PANELS', 9),

    'max_super_sub_panels' => (int) env('SELF_SURVEY_MAX_SUPER_SUB_PANELS', 9),
];

<?php

return [

    /*
    | Amount credited to the publisher (same currency as wallet / INR display) when a response is completed.
    | Also recorded in the `earnings` table and on the survey row.
    */
    'earning_per_response' => env('PUBLISHER_EARNING_PER_RESPONSE', '10.00'),

    /*
    | Amount added to the respondent (member) wallet after the delay (see survey payout schedule).
    | Shown on completed surveys; credited N days after completion.
    */
    'respondent_reward_usd' => env('RESPONDENT_SURVEY_REWARD_USD', '10.00'),

    /*
    | Days after survey completion before respondent wallet credit runs.
    | Default = 0 (instant credit on submit). Set RESPONDENT_SURVEY_PAYOUT_DELAY_DAYS=7
    | in .env if you ever want to switch back to a delayed payout window.
    */
    'respondent_payout_delay_days' => (int) env('RESPONDENT_SURVEY_PAYOUT_DELAY_DAYS', 0),

];

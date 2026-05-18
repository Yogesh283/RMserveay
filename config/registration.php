<?php

return [

    /**
     * When a new member registers without a sponsor referral code, place them under
     * this account on the configured binary leg (extreme-left / extreme-right slot).
     */
    'default_sponsor_login_uid' => env('DEFAULT_SPONSOR_LOGIN_UID', 'SEURBRRV'),

    'default_sponsor_binary_side' => env('DEFAULT_SPONSOR_BINARY_SIDE', 'right'),

];

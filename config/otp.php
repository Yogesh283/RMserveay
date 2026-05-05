<?php

return [

    /*
    | When true, login and registration skip OTP verification (local/dev only).
    | Never enable in production.
    */
    'bypass' => filter_var(env('OTP_BYPASS', false), FILTER_VALIDATE_BOOLEAN),

];

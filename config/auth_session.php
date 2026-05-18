<?php

/**
 * Member / publisher SPA session limits (cookie + Sanctum stateful API).
 */
return [

    /** Max logged-in duration from login time (minutes). Default: 24 hours. */
    'max_minutes' => (int) env('AUTH_SESSION_MAX_MINUTES', 1440),

];

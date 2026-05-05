<?php

$corsEnv = env('CORS_ALLOWED_ORIGINS');
$allowedOrigins = [];
if (is_string($corsEnv) && $corsEnv !== '') {
    foreach (explode(',', $corsEnv) as $o) {
        $t = trim($o);
        if ($t !== '') {
            $allowedOrigins[] = $t;
        }
    }
}
if ($allowedOrigins === [] && env('APP_URL')) {
    $allowedOrigins[] = rtrim((string) env('APP_URL'), '/');
}

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Axios uses withCredentials=true. Browsers require a concrete
    | Access-Control-Allow-Origin (not "*") when credentials are included.
    |
    | Set CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
    | or rely on APP_URL as a single allowed origin.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => filter_var(env('CORS_SUPPORTS_CREDENTIALS', true), FILTER_VALIDATE_BOOLEAN),

];

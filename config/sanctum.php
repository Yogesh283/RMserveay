<?php

use Laravel\Sanctum\Sanctum;

/*
| Stateful domains must match the browser Host (with optional port).
| Default included a bug: `%s%s` glued `::1` and APP_URL host → `::1example.com`,
| so production was often missing the real domain unless SANCTUM_STATEFUL_DOMAINS was set.
*/
$defaultLocal = 'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1';

$fromEnv = env('SANCTUM_STATEFUL_DOMAINS');
if (is_string($fromEnv) && trim($fromEnv) !== '') {
    $mergedStateful = $fromEnv;
} else {
    $parts = [$defaultLocal];
    $appHostPort = Sanctum::currentApplicationUrlWithPort();
    if ($appHostPort !== '') {
        $parts[] = $appHostPort;
    }
    $host = parse_url((string) config('app.url'), PHP_URL_HOST);
    if (is_string($host) && $host !== '' && ! filter_var($host, FILTER_VALIDATE_IP) && str_contains($host, '.')) {
        $parts[] = str_starts_with($host, 'www.') ? substr($host, 4) : 'www.'.$host;
    }
    $mergedStateful = implode(',', array_filter($parts));
}

$sanctumStateful = array_values(array_unique(array_filter(array_map(
    static fn ($d) => trim((string) $d),
    explode(',', $mergedStateful)
))));

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    |
    | Requests from the following domains / hosts will receive stateful API
    | authentication cookies. Typically, these should include your local
    | and production domains which access your API via a frontend SPA.
    |
    */

    'stateful' => $sanctumStateful,

    /*
    |--------------------------------------------------------------------------
    | Sanctum Guards
    |--------------------------------------------------------------------------
    |
    | This array contains the authentication guards that will be checked when
    | Sanctum is trying to authenticate a request. If none of these guards
    | are able to authenticate the request, Sanctum will use the bearer
    | token that's present on an incoming request for authentication.
    |
    */

    'guard' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Expiration Minutes
    |--------------------------------------------------------------------------
    |
    | This value controls the number of minutes until an issued token will be
    | considered expired. This will override any values set in the token's
    | "expires_at" attribute, but first-party sessions are not affected.
    |
    */

    'expiration' => null,

    /*
    |--------------------------------------------------------------------------
    | Token Prefix
    |--------------------------------------------------------------------------
    |
    | Sanctum can prefix new tokens in order to take advantage of numerous
    | security scanning initiatives maintained by open source platforms
    | that notify developers if they commit tokens into repositories.
    |
    | See: https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning
    |
    */

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Middleware
    |--------------------------------------------------------------------------
    |
    | When authenticating your first-party SPA with Sanctum you may need to
    | customize some of the middleware Sanctum uses while processing the
    | request. You may change the middleware listed below as required.
    |
    */

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],

];

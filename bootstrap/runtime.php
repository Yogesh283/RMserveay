<?php

declare(strict_types=1);

/*
| Laravel compiles Blade with tempnam() under storage/framework/views. If that
| directory is missing or PHP cannot write there, newer PHP emits a warning and
| may fall back to the system temp — which becomes a 500 under APP_DEBUG.
| Set TMPDIR to a path inside the project before the application boots.
*/

$runtimeBasePath = dirname(__DIR__);

$runtimeDirs = [
    $runtimeBasePath.'/storage/tmp',
    $runtimeBasePath.'/storage/framework/views',
    $runtimeBasePath.'/storage/framework/cache',
    $runtimeBasePath.'/storage/framework/cache/data',
    $runtimeBasePath.'/storage/framework/sessions',
    $runtimeBasePath.'/storage/logs',
];

foreach ($runtimeDirs as $dir) {
    if (! is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
}

$tmpDir = $runtimeBasePath.'/storage/tmp';
putenv('TMPDIR='.$tmpDir);
$_ENV['TMPDIR'] = $tmpDir;
$_SERVER['TMPDIR'] = $tmpDir;

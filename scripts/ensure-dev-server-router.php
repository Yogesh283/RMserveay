<?php

$source = __DIR__.'/server-router.php';

if (! is_file($source)) {
    fwrite(STDERR, "Missing scripts/server-router.php\n");
    exit(1);
}

$targets = [
    dirname(__DIR__).'/server.php',
    dirname(__DIR__).'/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php',
];

foreach ($targets as $target) {
    $dir = dirname($target);
    if (! is_dir($dir)) {
        continue;
    }

    if (! copy($source, $target)) {
        fwrite(STDERR, "Failed to copy dev server router to: {$target}\n");
        exit(1);
    }
}

echo "Dev server router installed.\n";

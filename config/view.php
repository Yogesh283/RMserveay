<?php

return [

    'paths' => [
        resource_path('views'),
    ],

    /*
    | Blade compiled views directory. Writable by the PHP-FPM / web server user on production.
    */
    'compiled' => env(
        'VIEW_COMPILED_PATH',
        realpath(storage_path('framework/views')) ?: storage_path('framework/views')
    ),

];

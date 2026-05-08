<?php

return [
    'filament_admin_emails' => array_values(array_filter(array_map(
        static fn (string $v): string => trim($v),
        explode(',', (string) env('FILAMENT_ADMIN_EMAILS', ''))
    ))),

    'filament_admin_login_uids' => array_values(array_filter(array_map(
        static fn (string $v): string => trim($v),
        explode(',', (string) env('FILAMENT_ADMIN_LOGIN_UIDS', ''))
    ))),
];


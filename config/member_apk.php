<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Member Android APK (welcome page download)
    |--------------------------------------------------------------------------
    |
    | Place the built APK at public/downloads/rm-survey-member.apk
    | or run: npm run cap:copy-apk
    |
    */

    'path' => env('MEMBER_APK_PATH', public_path('downloads/rm-survey-member.apk')),

    'download_name' => env('MEMBER_APK_DOWNLOAD_NAME', 'rm-survey-member.apk'),

];

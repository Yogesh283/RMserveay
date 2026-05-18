<?php

use App\Http\Controllers\Cron\BinaryDailyClosingCronController;
use App\Http\Controllers\Cron\RespondentPayoutsCronController;
use App\Http\Controllers\MemberApkDownloadController;
use Illuminate\Support\Facades\Route;

Route::get('/download/member-app', MemberApkDownloadController::class)
    ->name('download.member-app');

Route::view('/', 'welcome');
Route::view('/login', 'welcome')->name('login');

Route::match(['get', 'post'], '/cron/binary-daily-closing', [BinaryDailyClosingCronController::class, 'run'])
    ->middleware('throttle:30,1')
    ->name('cron.binary-daily-closing');

Route::match(['get', 'post'], '/cron/surveys-pay-respondent-payouts', [RespondentPayoutsCronController::class, 'run'])
    ->middleware('throttle:120,1')
    ->name('cron.surveys-pay-respondent-payouts');

Route::fallback(fn () => view('welcome'));

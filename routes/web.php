<?php

use App\Http\Controllers\Cron\BinaryDailyClosingCronController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'welcome');
Route::view('/login', 'welcome')->name('login');

Route::match(['get', 'post'], '/cron/binary-daily-closing', [BinaryDailyClosingCronController::class, 'run'])
    ->middleware('throttle:30,1')
    ->name('cron.binary-daily-closing');

Route::fallback(fn () => view('welcome'));

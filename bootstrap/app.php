<?php

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Behind nginx/Cloudflare/Hostinger: trust X-Forwarded-* so Secure cookies + HTTPS detection work.
        $middleware->trustProxies(at: '*');
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('surveys:pay-respondent-payouts')->hourly();

        $closingTz = (string) config('binary_closing.timezone', 'Asia/Kolkata');
        $closingTime = (string) config('binary_closing.closing_time', '00:00');
        $schedule->command('binary:daily-closing')
            ->dailyAt($closingTime)
            ->timezone($closingTz)
            ->withoutOverlapping(60)
            ->onOneServer();
    })
    ->create();

<?php

namespace App\Providers;

use App\Services\NowPayments\NowPaymentsClient;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(NowPaymentsClient::class, function ($app) {
            $config = $app['config']->get('nowpayments', []);

            return new NowPaymentsClient(
                (string) ($config['base_url'] ?? 'https://api.nowpayments.io/v1'),
                (string) ($config['api_key'] ?? ''),
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (str_starts_with((string) config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
    }
}

<?php

namespace App\Providers;

use App\Services\NowPayments\NowPaymentsClient;
use App\Services\NowPayments\NowPaymentsMassPayoutClient;
use Illuminate\Support\Facades\Config;
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

        $this->app->singleton(NowPaymentsMassPayoutClient::class, function ($app) {
            $config = $app['config']->get('nowpayments', []);
            $payouts = is_array($config['payouts'] ?? null) ? $config['payouts'] : [];

            return new NowPaymentsMassPayoutClient(
                (string) ($config['base_url'] ?? 'https://api.nowpayments.io/v1'),
                (string) ($config['api_key'] ?? ''),
                (string) ($payouts['email'] ?? ''),
                (string) ($payouts['password'] ?? ''),
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $appUrl = (string) config('app.url');

        if (str_starts_with($appUrl, 'https://')) {
            URL::forceScheme('https');
            // Unset SESSION_SECURE_COOKIE in .env often becomes null → cookies may not be marked Secure.
            if (config('session.secure') === null) {
                Config::set('session.secure', true);
            }
        }

        $domain = config('session.domain');
        if ($domain === '' || $domain === 'null') {
            Config::set('session.domain', null);
        }
    }
}

<?php

namespace App\Console\Commands;

use App\Services\NowPayments\NowPaymentsMassPayoutClient;
use Illuminate\Console\Command;
use Throwable;

class NowPaymentsPayoutCheckCommand extends Command
{
    protected $signature = 'nowpayments:payout-check';

    protected $description = 'Verify NOWPayments Mass Payout config and authenticate (withdrawal API).';

    public function handle(NowPaymentsMassPayoutClient $client): int
    {
        $payouts = config('nowpayments.payouts', []);
        $enabled = (bool) ($payouts['enabled'] ?? false);
        $email = trim((string) ($payouts['email'] ?? ''));
        $currency = (string) ($payouts['currency'] ?? 'usdtbsc');

        $this->line('Deposits (NOWPAYMENTS_ENABLED): '.(config('nowpayments.enabled') ? 'ON' : 'OFF'));
        $this->line('Mass payouts (withdrawals): '.($enabled ? 'ON' : 'OFF'));
        $this->line('Payout currency: '.$currency);
        $this->line('Payout login email: '.($email !== '' ? $email : '(empty — set NOWPAYMENTS_PAYOUT_EMAIL)'));

        if (! $enabled) {
            $this->newLine();
            $this->warn('Payouts disabled. Required in .env:');
            $this->line('  NOWPAYMENTS_PAYOUTS_ENABLED=true');
            $this->line('  NOWPAYMENTS_PAYOUT_EMAIL=your@nowpayments-account.email');
            $this->line('  NOWPAYMENTS_PAYOUT_PASSWORD=your-account-password');
            $this->line('  (plus existing NOWPAYMENTS_API_KEY + NOWPAYMENTS_IPN_SECRET)');
            $this->line('Then: php artisan config:clear');

            return self::FAILURE;
        }

        try {
            $this->info('Authenticating with NOWPayments POST /auth…');
            $client->authenticate(true);
            $this->info('Auth OK — admin can use Wallet → Withdrawals → Pay via NOWPayments.');
        } catch (Throwable $e) {
            $this->error('Auth failed: '.$e->getMessage());
            if (str_contains(strtolower($e->getMessage()), 'curl error 28')
                || str_contains(strtolower($e->getMessage()), 'timeout')) {
                $this->newLine();
                $this->warn('Cannot reach api.nowpayments.io from this server (network/firewall/DNS).');
                $this->line('  • Test: curl.exe https://api.nowpayments.io/v1/status');
                $this->line('  • Live server: allow outbound HTTPS to api.nowpayments.io:443');
                $this->line('  • .env: NOWPAYMENTS_HTTP_CONNECT_TIMEOUT=90 NOWPAYMENTS_HTTP_TIMEOUT=180');
            } elseif (str_contains(strtolower($e->getMessage()), 'invalid ip')
                || str_contains(strtolower($e->getMessage()), 'ip whitelist')) {
                $this->newLine();
                $this->warn($e->getMessage());
            } elseif (str_contains(strtolower($e->getMessage()), 'incorrect login')) {
                $this->newLine();
                $this->warn('NOWPayments rejected email/password (not a Laravel bug). Check:');
                $this->line('  1) Log in at https://account.nowpayments.io with the SAME email/password as .env');
                $this->line('  2) Email is case-sensitive — use your NP registration email (may not be support@…)');
                $this->line('  3) Payouts need the master account; sub-accounts cannot auth for mass payout');
                $this->line('  4) Forgot password → NP “create password” link on the login page');
                $this->line('  5) Quote password in .env if it has # or spaces: NOWPAYMENTS_PAYOUT_PASSWORD="…"');
            }

            return self::FAILURE;
        }

        try {
            $balance = $client->getBalance();
            $this->newLine();
            $this->line('Custody balance (raw):');
            $this->line(json_encode($balance, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) ?: '{}');
        } catch (Throwable $e) {
            $this->warn('Balance check failed (auth still OK): '.$e->getMessage());
        }

        return self::SUCCESS;
    }
}

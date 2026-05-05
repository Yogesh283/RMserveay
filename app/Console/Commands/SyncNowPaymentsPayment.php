<?php

namespace App\Console\Commands;

use App\Models\NowPaymentIntent;
use App\Services\NowPayments\NowPaymentsClient;
use App\Services\NowPayments\NowPaymentsLedgerService;
use Illuminate\Console\Command;
use RuntimeException;

class SyncNowPaymentsPayment extends Command
{
    protected $signature = 'nowpayments:sync-payment {payment_id : NOWPayments payment_id from dashboard or DB}';

    protected $description = 'Fetch payment status from NOWPayments API and sync wallet credit (recovery when IPN missed localhost).';

    public function handle(NowPaymentsClient $client, NowPaymentsLedgerService $ledger): int
    {
        if (! config('nowpayments.enabled')) {
            $this->error('NOWPayments is disabled or API/IPN keys missing in config.');

            return self::FAILURE;
        }

        $paymentId = trim((string) $this->argument('payment_id'));

        $intent = NowPaymentIntent::query()->where('payment_id', $paymentId)->first();
        if ($intent === null) {
            $this->error("No local deposit intent for payment_id {$paymentId}. Use an ID from now_payment_intents or recreate checkout.");

            return self::FAILURE;
        }

        try {
            $remote = $client->get('/payment/'.$paymentId);
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        if (! $remote->successful()) {
            $this->error($remote->body());

            return self::FAILURE;
        }

        /** @var array<string, mixed> $body */
        $body = $remote->json();
        $ledger->syncFromIpnPayload($body);

        $intent->refresh();

        $this->table(
            ['Field', 'Value'],
            [
                ['payment_id', (string) $intent->payment_id],
                ['payment_status', $intent->payment_status],
                ['credited', $intent->credited ? 'yes' : 'no'],
                ['user_id', (string) $intent->user_id],
            ]
        );

        if (! $intent->credited) {
            $this->warn('Still not credited — status may be waiting/confirming/sending/partially_paid. Check NOWPayments CREDIT_STATUSES (default finished,confirmed).');

            return self::SUCCESS;
        }

        $this->info('Wallet credited (if status matched configured credit statuses).');

        return self::SUCCESS;
    }
}

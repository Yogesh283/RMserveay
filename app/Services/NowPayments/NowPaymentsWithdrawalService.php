<?php

namespace App\Services\NowPayments;

use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\WalletBucketService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class NowPaymentsWithdrawalService
{
    public function __construct(
        protected NowPaymentsMassPayoutClient $client,
        protected WalletBucketService $walletBuckets,
    ) {}

    public function payoutsConfigured(): bool
    {
        return (bool) config('nowpayments.payouts.enabled');
    }

    public function withdrawalStatus(WalletTransaction $tx): string
    {
        $meta = is_array($tx->meta) ? $tx->meta : [];

        return (string) ($meta['status'] ?? 'queued');
    }

    /**
     * Send a queued member withdrawal to NOWPayments Mass Payout API.
     *
     * @return array<string, mixed>
     */
    public function sendToNowPayments(WalletTransaction $tx): array
    {
        $this->assertWithdrawalRow($tx);

        if (! $this->payoutsConfigured()) {
            throw new RuntimeException('NOWPayments payouts are not enabled. Set NOWPAYMENTS_PAYOUTS_ENABLED and payout credentials in .env.');
        }

        $status = $this->withdrawalStatus($tx);
        if (! in_array($status, ['queued', 'failed'], true)) {
            throw ValidationException::withMessages([
                'status' => ["Withdrawal is already “{$status}” and cannot be sent again."],
            ]);
        }

        $meta = is_array($tx->meta) ? $tx->meta : [];
        $address = (string) ($meta['bep20_address'] ?? '');
        if ($address === '' || ! preg_match('/^0x[a-fA-F0-9]{40}$/', $address)) {
            throw ValidationException::withMessages(['address' => ['Invalid BEP20 withdrawal address on this request.']]);
        }

        $net = (string) ($meta['net_sent_usd'] ?? '');
        if ($net === '' || bccomp($net, '0', 6) <= 0) {
            throw ValidationException::withMessages(['amount' => ['Net payout amount is missing or zero.']]);
        }

        $currency = strtolower((string) config('nowpayments.payouts.currency', 'usdtbsc'));
        $amount = round((float) $net, 6);
        $ipnUrl = url('/api/payments/nowpayments/ipn');
        $externalId = 'wallet_tx_'.$tx->id;

        // NOWPayments Mass Payout expects withdrawals[] items at the top level,
        // each item containing address/currency/amount (no extra nested withdrawals array).
        $withdrawalItem = [
            'unique_external_id' => $externalId,
            'address' => $address,
            'currency' => $currency,
            'amount' => $amount,
            'ipn_callback_url' => $ipnUrl,
            'payout_description' => 'RM Survey withdrawal #'.$tx->id,
        ];

        $response = $this->client->createPayout([$withdrawalItem]);

        $payoutId = $this->extractPayoutId($response);

        $meta['status'] = 'np_creating';
        $meta['nowpayments'] = [
            'payout_id' => $payoutId,
            'external_id' => $externalId,
            'currency' => $currency,
            'amount' => $amount,
            'submitted_at' => now()->toIso8601String(),
            'create_response' => $response,
        ];
        $meta['admin_last_action_at'] = now()->toIso8601String();

        $tx->meta = $meta;
        $tx->save();

        Log::info('nowpayments.withdrawal.submitted', [
            'wallet_transaction_id' => $tx->id,
            'payout_id' => $payoutId,
            'user_id' => $tx->user_id,
            'net_usd' => $net,
        ]);

        return $response;
    }

    /**
     * @return array<string, mixed>
     */
    public function verifyWithCode(WalletTransaction $tx, string $verificationCode): array
    {
        $this->assertWithdrawalRow($tx);

        $meta = is_array($tx->meta) ? $tx->meta : [];
        $payoutId = (string) ($meta['nowpayments']['payout_id'] ?? '');
        if ($payoutId === '') {
            throw ValidationException::withMessages(['payout' => ['No NOWPayments payout id on this withdrawal. Send to gateway first.']]);
        }

        $response = $this->client->verifyPayout($payoutId, trim($verificationCode));

        $meta['nowpayments']['verify_response'] = $response;
        $meta['nowpayments']['verified_at'] = now()->toIso8601String();
        $meta['status'] = 'np_processing';
        $meta['admin_last_action_at'] = now()->toIso8601String();
        $tx->meta = $meta;
        $tx->save();

        return $response;
    }

    /**
     * Poll NOWPayments and merge status into wallet transaction meta.
     *
     * @return array<string, mixed>
     */
    public function refreshStatus(WalletTransaction $tx): array
    {
        $this->assertWithdrawalRow($tx);

        $meta = is_array($tx->meta) ? $tx->meta : [];
        $payoutId = (string) ($meta['nowpayments']['payout_id'] ?? '');
        if ($payoutId === '') {
            throw ValidationException::withMessages(['payout' => ['No NOWPayments payout id on this withdrawal.']]);
        }

        $response = $this->client->getPayout($payoutId);
        $this->applyPayoutPayloadToTransaction($tx, $response, fromPoll: true);

        return $response;
    }

    /**
     * @param  array<string, mixed>  $payload  IPN body or GET /payout/{id} response
     */
    public function applyPayoutPayloadToTransaction(WalletTransaction $tx, array $payload, bool $fromPoll = false): void
    {
        $this->assertWithdrawalRow($tx);

        $meta = is_array($tx->meta) ? $tx->meta : [];
        $npStatus = strtolower((string) ($payload['status'] ?? $payload['payout_status'] ?? ''));

        if ($npStatus !== '') {
            $meta['nowpayments']['last_status'] = $npStatus;
            $meta['nowpayments']['last_status_at'] = now()->toIso8601String();
            if ($fromPoll) {
                $meta['nowpayments']['last_poll_response'] = $payload;
            } else {
                $meta['nowpayments']['last_ipn'] = $payload;
            }

            $meta['status'] = match (true) {
                in_array($npStatus, ['finished', 'sent', 'confirmed'], true) => 'sent',
                in_array($npStatus, ['failed', 'rejected', 'expired'], true) => 'failed',
                in_array($npStatus, ['creating', 'waiting'], true) => 'np_creating',
                default => 'np_processing',
            };
        }

        $tx->meta = $meta;
        $tx->save();
    }

    public function rejectAndRefund(WalletTransaction $tx, string $reason = ''): void
    {
        $this->assertWithdrawalRow($tx);

        $status = $this->withdrawalStatus($tx);
        if (in_array($status, ['sent', 'np_processing'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Cannot refund after payout was sent or is processing on-chain. Refresh status first.'],
            ]);
        }

        DB::transaction(function () use ($tx, $reason, $status): void {
            /** @var WalletTransaction $locked */
            $locked = WalletTransaction::whereKey($tx->id)->lockForUpdate()->firstOrFail();

            if ($this->withdrawalStatus($locked) === 'rejected') {
                return;
            }

            if (in_array($this->withdrawalStatus($locked), ['sent'], true)) {
                throw ValidationException::withMessages(['status' => ['Already marked sent.']]);
            }

            $meta = is_array($locked->meta) ? $locked->meta : [];
            $gross = (string) ($meta['gross_usd'] ?? ltrim((string) $locked->amount, '-'));

            /** @var User $user */
            $user = User::whereKey($locked->user_id)->lockForUpdate()->firstOrFail();

            $this->walletBuckets->creditMainIncome($user, $gross);
            $user->save();

            $meta['status'] = 'rejected';
            $meta['rejected_at'] = now()->toIso8601String();
            $meta['reject_reason'] = $reason !== '' ? $reason : null;
            $meta['refund_gross_usd'] = $gross;
            $locked->meta = $meta;
            $locked->save();
        });
    }

    protected function assertWithdrawalRow(WalletTransaction $tx): void
    {
        if ($tx->type !== WalletTransaction::TYPE_WITHDRAWAL) {
            throw new RuntimeException('Not a withdrawal transaction.');
        }
    }

    /**
     * @param  array<string, mixed>  $response
     */
    protected function extractPayoutId(array $response): string
    {
        foreach (['id', 'payout_id', 'batch_id'] as $key) {
            if (! empty($response[$key])) {
                return (string) $response[$key];
            }
        }

        if (isset($response['withdrawals']) && is_array($response['withdrawals'])) {
            $first = $response['withdrawals'][0] ?? null;
            if (is_array($first) && ! empty($first['id'])) {
                return (string) $first['id'];
            }
        }

        return '';
    }

    /**
     * Resolve wallet transaction from payout IPN / poll payload.
     */
    public function findTransactionForPayoutPayload(array $payload): ?WalletTransaction
    {
        $external = (string) ($payload['unique_external_id'] ?? '');
        if (str_starts_with($external, 'wallet_tx_')) {
            $id = (int) substr($external, strlen('wallet_tx_'));
            if ($id > 0) {
                $tx = WalletTransaction::query()->find($id);
                if ($tx && $tx->type === WalletTransaction::TYPE_WITHDRAWAL) {
                    return $tx;
                }
            }
        }

        $payoutId = (string) ($payload['payout_id'] ?? $payload['id'] ?? '');
        if ($payoutId === '') {
            return null;
        }

        return WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_WITHDRAWAL)
            ->where('meta->nowpayments->payout_id', $payoutId)
            ->first();
    }
}

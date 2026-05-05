<?php

namespace App\Services\NowPayments;

use App\Models\NowPaymentIntent;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NowPaymentsLedgerService
{
    /** Credit main wallet once per intent when status matches {@see config('nowpayments.credit_statuses')}. */
    public function syncFromIpnPayload(array $payload): void
    {
        $paymentId = isset($payload['payment_id']) ? (string) $payload['payment_id'] : '';
        if ($paymentId === '') {
            Log::debug('nowpayments.sync skipped: missing payment_id');

            return;
        }

        $status = isset($payload['payment_status']) ? strtolower((string) $payload['payment_status']) : '';
        $payinHash = isset($payload['payin_hash']) && is_string($payload['payin_hash'])
            ? strtolower($payload['payin_hash'])
            : null;

        DB::transaction(function () use ($paymentId, $status, $payinHash, $payload): void {
            /** @var NowPaymentIntent|null $intent */
            $intent = NowPaymentIntent::query()
                ->where('payment_id', $paymentId)
                ->lockForUpdate()
                ->first();

            if ($intent === null) {
                Log::warning('nowpayments.sync no intent row', ['payment_id' => $paymentId]);

                return;
            }

            $intent->payment_status = $status !== '' ? $status : $intent->payment_status;
            if ($payinHash !== null && $payinHash !== '') {
                $intent->payin_hash = $payinHash;
            }
            $intent->save();

            $creditStatuses = config('nowpayments.credit_statuses', ['finished']);
            $creditStatuses = is_array($creditStatuses) ? $creditStatuses : ['finished'];
            $creditStatuses = array_map(static fn (string $s): string => strtolower($s), $creditStatuses);

            if ($intent->credited || ! in_array($status, $creditStatuses, true)) {
                return;
            }

            // Never auto-credit underpayments at full price_amount.
            if ($status === 'partially_paid') {
                return;
            }

            $amountUsd = $this->resolveCreditUsd($intent, $payload);
            if (bccomp($amountUsd, '0.00', 2) <= 0) {
                return;
            }

            /** @var User $user */
            $user = User::query()->whereKey($intent->user_id)->lockForUpdate()->firstOrFail();
            $user->reconcileBalancesFromWalletTableIfBlank();
            $user->refresh();

            $newBalance = bcadd((string) $user->wallet_balance, $amountUsd, 2);
            $user->wallet_balance = $newBalance;
            $user->save();
            $user->refresh();

            WalletTransaction::create([
                'user_id' => $user->id,
                'type' => WalletTransaction::TYPE_DEPOSIT_CREDIT,
                'amount' => $amountUsd,
                'balance_after' => $newBalance,
                'meta' => [
                    'source' => 'nowpayments',
                    'nowpayments_payment_id' => $paymentId,
                    'payment_status_at_credit' => $status,
                    'payin_hash' => $intent->payin_hash,
                    'pay_currency' => (string) ($payload['pay_currency'] ?? $intent->pay_currency ?? ''),
                    'network' => config('wallet_display.network_label'),
                    'p2p_balance_after' => (string) $user->p2p_wallet_balance,
                ],
            ]);

            $intent->credited = true;
            $intent->save();

            Log::info('nowpayments.wallet credited', [
                'payment_id' => $paymentId,
                'user_id' => $user->id,
                'amount_usd' => $amountUsd,
                'status' => $status,
            ]);
        });
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveCreditUsd(NowPaymentIntent $intent, array $payload): string
    {
        if (isset($payload['price_amount'])) {
            return number_format((float) $payload['price_amount'], 2, '.', '');
        }

        return number_format((float) $intent->amount_usd, 2, '.', '');
    }
}

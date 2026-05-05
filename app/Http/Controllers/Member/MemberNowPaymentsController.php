<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\NowPaymentIntent;
use App\Models\User;
use App\Services\NowPayments\NowPaymentsClient;
use App\Services\NowPayments\NowPaymentsLedgerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class MemberNowPaymentsController extends Controller
{
    public function create(Request $request, NowPaymentsClient $client): JsonResponse
    {
        if (! config('nowpayments.enabled')) {
            abort(503, 'NOWPayments deposits are not enabled.');
        }

        $allowed = config('nowpayments.allowed_pay_currencies', ['usdtbsc']);
        $allowed = is_array($allowed) ? $allowed : ['usdtbsc'];

        $validated = $request->validate([
            'amount_usd' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'pay_currency' => ['sometimes', 'string', 'max:32', Rule::in($allowed)],
        ]);

        $min = (string) config('wallet_display.min_deposit_usd');
        $amountUsd = number_format((float) $validated['amount_usd'], 2, '.', '');
        if (bccomp($amountUsd, $min, 2) < 0) {
            throw ValidationException::withMessages(['amount_usd' => ["Minimum deposit is {$min} USDT."]]);
        }

        $orderId = 'np_'.Str::lower(Str::uuid()->toString());
        $payCurrency = isset($validated['pay_currency']) && is_string($validated['pay_currency'])
            ? strtolower($validated['pay_currency'])
            : (string) config('nowpayments.pay_currency');
        $ipnUrl = url('/api/payments/nowpayments/ipn');

        $payoutAddress = trim((string) config('nowpayments.payout_address'));
        $payoutCurrency = trim((string) config('nowpayments.payout_currency'));

        $intent = NowPaymentIntent::create([
            'user_id' => $request->user()->id,
            'order_id' => $orderId,
            'amount_usd' => $amountUsd,
            'payment_status' => 'creating',
        ]);

        $paymentPayload = [
            'price_amount' => (float) $amountUsd,
            'price_currency' => 'usd',
            'pay_currency' => $payCurrency,
            'order_id' => $orderId,
            'order_description' => 'RM Survey wallet deposit',
            'ipn_callback_url' => $ipnUrl,
        ];

        if ($payoutAddress !== '') {
            $paymentPayload['payout_address'] = $payoutAddress;
            $paymentPayload['payout_currency'] = $payoutCurrency !== '' ? $payoutCurrency : $payCurrency;
        }

        try {
            $response = $client->post('/payment', $paymentPayload);
        } catch (RuntimeException $e) {
            $intent->delete();

            throw ValidationException::withMessages([
                'amount_usd' => [$e->getMessage()],
            ]);
        }

        if (! $response->successful()) {
            $intent->delete();

            return response()->json([
                'message' => 'NOWPayments could not create a payment.',
                'details' => $response->json('message') ?? $response->body(),
            ], 422);
        }

        /** @var array<string, mixed> $body */
        $body = $response->json();
        $paymentId = isset($body['payment_id']) ? (string) $body['payment_id'] : '';

        if ($paymentId === '') {
            $intent->delete();

            return response()->json(['message' => 'Invalid response from NOWPayments.'], 502);
        }

        $intent->payment_id = $paymentId;
        $intent->pay_address = isset($body['pay_address']) ? (string) $body['pay_address'] : null;
        $intent->pay_amount = isset($body['pay_amount']) ? (string) $body['pay_amount'] : null;
        $intent->pay_currency = isset($body['pay_currency']) ? (string) $body['pay_currency'] : $payCurrency;
        $intent->payment_status = isset($body['payment_status']) ? (string) $body['payment_status'] : 'waiting';
        $intent->save();

        return response()->json([
            'payment_id' => $paymentId,
            'order_id' => $orderId,
            'payment_status' => $intent->payment_status,
            'pay_address' => $intent->pay_address,
            'pay_amount' => $intent->pay_amount,
            'pay_currency' => $intent->pay_currency,
            'price_amount' => $amountUsd,
            'price_currency' => 'usd',
        ], 201);
    }

    public function show(Request $request, string $paymentId, NowPaymentsClient $client): JsonResponse
    {
        if (! config('nowpayments.enabled')) {
            abort(503, 'NOWPayments deposits are not enabled.');
        }

        $paymentId = trim($paymentId);
        /** @var User $user */
        $user = $request->user();

        $intent = NowPaymentIntent::query()
            ->where('user_id', $user->id)
            ->where('payment_id', $paymentId)
            ->firstOrFail();

        try {
            $remote = $client->get('/payment/'.$paymentId);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 503);
        }

        if (! $remote->successful()) {
            return response()->json([
                'message' => 'Could not load payment status.',
                'local' => $this->intentPayload($intent),
            ], 502);
        }

        /** @var array<string, mixed> $body */
        $body = $remote->json();

        // Best-effort sync when IPN never reached your server (typical on localhost).
        $remoteStatus = isset($body['payment_status']) ? strtolower((string) $body['payment_status']) : '';
        $creditStatuses = config('nowpayments.credit_statuses', ['finished']);
        $creditStatuses = is_array($creditStatuses) ? $creditStatuses : ['finished'];
        $creditStatuses = array_map(static fn (string $s): string => strtolower($s), $creditStatuses);

        if ($remoteStatus !== '' && in_array($remoteStatus, $creditStatuses, true) && ! $intent->credited) {
            app(NowPaymentsLedgerService::class)->syncFromIpnPayload($body);
            $intent->refresh();
        }

        return response()->json([
            'local' => $this->intentPayload($intent->fresh()),
            'remote' => $body,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function intentPayload(NowPaymentIntent $intent): array
    {
        return [
            'order_id' => $intent->order_id,
            'payment_id' => $intent->payment_id,
            'amount_usd' => (string) $intent->amount_usd,
            'payment_status' => $intent->payment_status,
            'pay_address' => $intent->pay_address,
            'pay_amount' => $intent->pay_amount !== null ? (string) $intent->pay_amount : null,
            'pay_currency' => $intent->pay_currency,
            'credited' => $intent->credited,
        ];
    }
}

<?php

namespace App\Http\Controllers\Payments;

use App\Http\Controllers\Controller;
use App\Services\NowPayments\NowPaymentsIpnVerifier;
use App\Services\NowPayments\NowPaymentsLedgerService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class NowPaymentsIpnController extends Controller
{
    public function __construct(
        protected NowPaymentsLedgerService $ledger,
    ) {}

    public function __invoke(Request $request): Response
    {
        if (! config('nowpayments.enabled')) {
            return response('NOWPayments disabled.', 503);
        }

        $secret = (string) config('nowpayments.ipn_secret');
        if ($secret === '') {
            return response('IPN not configured.', 503);
        }

        $raw = $request->getContent();
        /** @var array<string, mixed>|null $data */
        $data = json_decode($raw, true);
        if (! is_array($data)) {
            return response('Invalid JSON.', 400);
        }

        $sig = $request->header('x-nowpayments-sig');
        if (! NowPaymentsIpnVerifier::isValid($data, $sig, $secret)) {
            Log::warning('nowpayments.ipn signature mismatch', [
                'payment_id' => $data['payment_id'] ?? null,
                'payment_status' => $data['payment_status'] ?? null,
                'has_sig_header' => $sig !== null && $sig !== '',
            ]);

            return response('Invalid signature.', 403);
        }

        Log::debug('nowpayments.ipn ok', [
            'payment_id' => $data['payment_id'] ?? null,
            'payment_status' => $data['payment_status'] ?? null,
        ]);

        $this->ledger->syncFromIpnPayload($data);

        return response('OK', 200);
    }
}

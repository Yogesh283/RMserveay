<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Auth\OtpController;
use App\Http\Controllers\Controller;
use App\Mail\OtpMail;
use App\Models\DepositNotification;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\WalletBucketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MemberWalletController extends Controller
{
    private const WITHDRAW_OTP_TTL_MINUTES = 10;

    public function __construct(
        protected WalletBucketService $walletBuckets,
    ) {}

    public function overview(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->reconcileBalancesFromWalletTableIfBlank();
        $user->refresh();

        $b = $user->balancesForApi();

        $p2pCode = (string) ($user->p2p_receive_code ?? '');

        return response()->json([
            'wallet_balance' => $b['wallet_balance'],
            'p2p_wallet_balance' => $b['p2p_wallet_balance'],
            'p2p_receive_code' => $p2pCode,
            'p2p_receive_qr_payload' => $p2pCode !== '' ? User::P2P_RECEIVE_QR_PREFIX.$p2pCode : '',
            'withdrawal_address' => $user->usdt_bep20_withdrawal_address,
            'recent_transactions' => $this->mapTransactions($user->id),
            'limits' => [
                'network' => config('wallet_display.network_label'),
                'asset' => config('wallet_display.asset'),
                'min_deposit_usd' => config('wallet_display.min_deposit_usd'),
                'min_withdraw_usd' => config('wallet_display.min_withdraw_usd'),
                'min_p2p_usd' => config('wallet_display.min_p2p_usd'),
                'direct_withdrawal_fee_rate' => config('wallet_display.direct_withdrawal_fee_rate'),
                'main_to_p2p_bonus_rate' => config('wallet_display.main_to_p2p_bonus_rate'),
            ],
        ]);
    }

    public function depositInfo(): JsonResponse
    {
        return response()->json([
            'network' => config('wallet_display.network_label'),
            'asset' => config('wallet_display.asset'),
            'treasury_bep20_address' => config('wallet_display.treasury_bep20_address'),
            'min_deposit_usd' => config('wallet_display.min_deposit_usd'),
            'nowpayments_enabled' => (bool) config('nowpayments.enabled'),
            /** NP settlement override active (per-payment payout_address); empty string if not configured */
            'nowpayments_settlement_wallet_configured' => trim((string) config('nowpayments.payout_address')) !== '',
            'nowpayments_pay_currencies' => config('nowpayments.allowed_pay_currencies', ['usdtbsc']),
            'nowpayments_default_pay_currency' => (string) config('nowpayments.pay_currency'),
        ]);
    }

    public function deposit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount_usd' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'tx_hash' => ['required', 'string', 'max:128', 'regex:/^0x[a-fA-F0-9]{64}$/'],
        ]);

        $min = (string) config('wallet_display.min_deposit_usd');
        $amount = number_format((float) $validated['amount_usd'], 2, '.', '');
        if (bccomp($amount, $min, 2) < 0) {
            throw ValidationException::withMessages(['amount_usd' => ["Minimum deposit is {$min} USDT."]]);
        }

        $hash = strtolower($validated['tx_hash']);
        if (DepositNotification::where('tx_hash', $hash)->exists()) {
            throw ValidationException::withMessages(['tx_hash' => ['This transaction hash was already credited.']]);
        }

        return DB::transaction(function () use ($request, $amount, $hash) {
            /** @var User $user */
            $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $user->reconcileBalancesFromWalletTableIfBlank();
            $user->refresh();

            DepositNotification::create([
                'user_id' => $user->id,
                'amount' => $amount,
                'tx_hash' => $hash,
            ]);

            $newBalance = bcadd((string) $user->wallet_balance, $amount, 2);
            $user->wallet_balance = $newBalance;
            $user->save();
            $user->refresh();

            WalletTransaction::create([
                'user_id' => $user->id,
                'type' => WalletTransaction::TYPE_DEPOSIT_CREDIT,
                'amount' => $amount,
                'balance_after' => $newBalance,
                'meta' => [
                    'tx_hash' => $hash,
                    'network' => config('wallet_display.network_label'),
                    'p2p_balance_after' => (string) $user->p2p_wallet_balance,
                ],
            ]);

            $b = $user->balancesForApi();

            return response()->json([
                'message' => 'Deposit credited to main wallet.',
                'wallet_balance' => $b['wallet_balance'],
                'p2p_wallet_balance' => $b['p2p_wallet_balance'],
            ]);
        });
    }

    /** Move USDT from main → internal P2P wallet (+10% bonus on default config). */
    public function mainToP2p(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount_usd' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $amount = number_format((float) $validated['amount_usd'], 2, '.', '');
        $bonusRate = (string) config('wallet_display.main_to_p2p_bonus_rate');
        $bonus = bcmul($amount, $bonusRate, 2);
        $totalToP2p = bcadd($amount, $bonus, 2);

        return DB::transaction(function () use ($request, $validated, $amount, $bonus, $totalToP2p, $bonusRate) {
            /** @var User $user */
            $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $user->reconcileBalancesFromWalletTableIfBlank();
            $user->refresh();

            if (! Hash::check($validated['password'], $user->password)) {
                throw ValidationException::withMessages([
                    'password' => ['The password you entered is incorrect.'],
                ]);
            }

            if (bccomp((string) $user->wallet_balance, $amount, 2) < 0) {
                abort(422, 'Insufficient main wallet balance.');
            }

            $user->wallet_balance = bcsub((string) $user->wallet_balance, $amount, 2);
            $user->p2p_wallet_balance = bcadd((string) $user->p2p_wallet_balance, $totalToP2p, 2);
            $user->save();

            $transaction = WalletTransaction::create([
                'user_id' => $user->id,
                'type' => WalletTransaction::TYPE_MAIN_TO_P2P,
                'amount' => '-'.$amount,
                'balance_after' => (string) $user->wallet_balance,
                'meta' => [
                    'bonus_usd' => $bonus,
                    'bonus_rate' => $bonusRate,
                    'credited_to_p2p_usd' => $totalToP2p,
                    'p2p_balance_after' => (string) $user->p2p_wallet_balance,
                ],
            ]);

            return response()->json([
                'message' => 'Funds moved to P2P wallet with bonus.',
                'wallet_balance' => (string) $user->wallet_balance,
                'p2p_wallet_balance' => (string) $user->p2p_wallet_balance,
                'bonus_usd' => $bonus,
                'total_credited_p2p_usd' => $totalToP2p,
                'transaction' => [
                    'id' => $transaction->id,
                    'type' => $transaction->type,
                    'amount_debited_main_usd' => $amount,
                    'bonus_usd' => $bonus,
                    'bonus_rate' => $bonusRate,
                    'total_credited_p2p_usd' => $totalToP2p,
                    'main_wallet_balance_after' => (string) $user->wallet_balance,
                    'p2p_wallet_balance_after' => (string) $user->p2p_wallet_balance,
                    'created_at' => $transaction->created_at?->toIso8601String(),
                ],
            ]);
        });
    }

    /** Move USDT from P2P → main (1:1, no bonus). */
    public function p2pToMain(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount_usd' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
        ]);

        $amount = number_format((float) $validated['amount_usd'], 2, '.', '');

        return DB::transaction(function () use ($request, $amount) {
            /** @var User $user */
            $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $user->reconcileBalancesFromWalletTableIfBlank();
            $user->refresh();

            if (bccomp((string) $user->p2p_wallet_balance, $amount, 2) < 0) {
                throw ValidationException::withMessages([
                    'amount_usd' => ['Insufficient P2P wallet balance for this amount.'],
                ]);
            }

            $user->p2p_wallet_balance = bcsub((string) $user->p2p_wallet_balance, $amount, 2);
            $user->wallet_balance = bcadd((string) $user->wallet_balance, $amount, 2);
            $user->save();
            $user->refresh();

            WalletTransaction::create([
                'user_id' => $user->id,
                'type' => WalletTransaction::TYPE_P2P_TO_MAIN,
                'amount' => $amount,
                'balance_after' => (string) $user->wallet_balance,
                'meta' => [
                    'from_p2p_usd' => $amount,
                    'p2p_balance_after' => (string) $user->p2p_wallet_balance,
                ],
            ]);

            $b = $user->balancesForApi();

            return response()->json([
                'message' => 'Funds moved to main wallet.',
                'wallet_balance' => $b['wallet_balance'],
                'p2p_wallet_balance' => $b['p2p_wallet_balance'],
            ]);
        });
    }

    /**
     * Resolve a pasted or scanned P2P QR payload to a safe recipient display (name + login UID).
     */
    public function p2pRecipientLookup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:256'],
        ]);

        $raw = trim((string) $validated['code']);
        $normalized = User::parseP2pReceivePayload($raw);
        if ($normalized === null) {
            throw ValidationException::withMessages([
                'code' => ['Invalid P2P receive code.'],
            ]);
        }

        $recipient = User::query()->where('p2p_receive_code', $normalized)->first();
        if ($recipient === null) {
            throw ValidationException::withMessages([
                'code' => ['No member found with this P2P code.'],
            ]);
        }

        $senderId = (int) $request->user()->id;
        if ((int) $recipient->id === $senderId) {
            throw ValidationException::withMessages([
                'code' => ['You cannot send to your own receive code.'],
            ]);
        }

        return response()->json([
            'login_uid' => (string) $recipient->login_uid,
            'name' => trim((string) ($recipient->name ?? '')),
            'email_masked' => $this->maskEmail((string) $recipient->email),
        ]);
    }

    public function p2pTransfer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount_usd' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'password' => ['required', 'string', 'max:255'],
            'recipient_p2p_code' => ['nullable', 'string', 'max:128'],
            'recipient_login_uid' => ['nullable', 'string', 'max:64'],
        ]);

        $p2pRaw = isset($validated['recipient_p2p_code']) ? trim((string) $validated['recipient_p2p_code']) : '';
        $loginUidRaw = isset($validated['recipient_login_uid']) ? strtolower(trim((string) $validated['recipient_login_uid'])) : '';

        $modes = (int) ($p2pRaw !== '') + (int) ($loginUidRaw !== '');
        if ($modes !== 1) {
            throw ValidationException::withMessages([
                'recipient' => ['Provide exactly one of: P2P receive code (or scanned QR text), or recipient user ID.'],
            ]);
        }

        $min = (string) config('wallet_display.min_p2p_usd');
        $amount = number_format((float) $validated['amount_usd'], 2, '.', '');
        if (bccomp($amount, $min, 2) < 0) {
            throw ValidationException::withMessages(['amount_usd' => ["Minimum P2P transfer is {$min} USDT."]]);
        }

        if ($p2pRaw !== '') {
            $normalized = User::parseP2pReceivePayload($p2pRaw);
            if ($normalized === null) {
                throw ValidationException::withMessages([
                    'recipient_p2p_code' => ['Invalid P2P receive code. Scan again or paste the RMS… code.'],
                ]);
            }
            $recipient = User::query()->where('p2p_receive_code', $normalized)->first();
        } else {
            $recipient = User::query()->where('login_uid', $loginUidRaw)->first();
        }

        if ($recipient === null) {
            throw ValidationException::withMessages(['recipient' => ['Recipient account not found.']]);
        }

        $senderId = $request->user()->id;
        if ((int) $recipient->id === (int) $senderId) {
            throw ValidationException::withMessages(['recipient' => ['Cannot transfer to yourself.']]);
        }

        return DB::transaction(function () use ($senderId, $recipient, $amount, $validated) {
            /** @var User $sender */
            $sender = User::whereKey($senderId)->lockForUpdate()->firstOrFail();
            $sender->reconcileBalancesFromWalletTableIfBlank();
            $sender->refresh();

            if (! Hash::check($validated['password'], $sender->password)) {
                throw ValidationException::withMessages([
                    'password' => ['The password you entered is incorrect.'],
                ]);
            }

            /** @var User $receiver */
            $receiver = User::whereKey($recipient->id)->lockForUpdate()->firstOrFail();
            $receiver->reconcileBalancesFromWalletTableIfBlank();
            $receiver->refresh();

            $sources = $this->walletBuckets->deductP2pThenMain($sender, $amount);
            $sender->save();

            $batchId = (string) Str::uuid();

            $outTx = WalletTransaction::create([
                'user_id' => $sender->id,
                'type' => WalletTransaction::TYPE_P2P_TRANSFER_OUT,
                'amount' => '-'.$amount,
                'balance_after' => (string) $sender->wallet_balance,
                'meta' => [
                    'to_user_id' => $receiver->id,
                    'to_email' => $receiver->email,
                    'to_login_uid' => $receiver->login_uid !== null ? (string) $receiver->login_uid : null,
                    'to_name' => trim((string) ($receiver->name ?? '')),
                    'p2p_batch_id' => $batchId,
                    'from_p2p_usd' => $sources['from_p2p'],
                    'from_main_usd' => $sources['from_main'],
                    'p2p_balance_after' => (string) $sender->p2p_wallet_balance,
                ],
            ]);

            $this->walletBuckets->creditP2p($receiver, $amount);
            $receiver->save();

            $inTx = WalletTransaction::create([
                'user_id' => $receiver->id,
                'type' => WalletTransaction::TYPE_P2P_TRANSFER_IN,
                'amount' => $amount,
                'balance_after' => (string) $receiver->wallet_balance,
                'meta' => [
                    'from_user_id' => $sender->id,
                    'from_email' => $sender->email,
                    'from_login_uid' => $sender->login_uid !== null ? (string) $sender->login_uid : null,
                    'from_name' => trim((string) ($sender->name ?? '')),
                    'p2p_batch_id' => $batchId,
                    'bucket' => 'p2p',
                    'p2p_balance_after' => (string) $receiver->p2p_wallet_balance,
                ],
            ]);

            $b = $sender->balancesForApi();

            return response()->json([
                'message' => 'P2P transfer completed (no withdrawal fee). Recipient credited to P2P wallet.',
                'wallet_balance' => $b['wallet_balance'],
                'p2p_wallet_balance' => $b['p2p_wallet_balance'],
                'transaction' => [
                    'p2p_batch_id' => $batchId,
                    'amount_usd' => $amount,
                    'recipient_user_id' => $receiver->id,
                    'recipient_login_uid' => (string) $receiver->login_uid,
                    'recipient_email_masked' => $this->maskEmail((string) $receiver->email),
                    'out_transaction_id' => $outTx->id,
                    'in_transaction_id' => $inTx->id,
                    'created_at' => $outTx->created_at?->toIso8601String(),
                ],
            ]);
        });
    }

    private function maskEmail(string $email): string
    {
        if ($email === '' || ! str_contains($email, '@')) {
            return '—';
        }
        [$local, $domain] = explode('@', $email, 2);
        $len = strlen($local);
        $keep = max(1, (int) ceil($len / 4));
        $masked = substr($local, 0, $keep).str_repeat('•', max(2, $len - $keep)).'@'.$domain;

        return $masked;
    }

    /** Direct withdrawal debits main wallet only; 15% fee — net sent on-chain is gross − fee. */
    public function sendWithdrawOtp(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $rateKey = 'otp-send:withdraw:'.$user->id.'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($rateKey, 5)) {
            throw ValidationException::withMessages([
                'otp' => ['Too many OTP requests. Try again in a few minutes.'],
            ]);
        }
        RateLimiter::hit($rateKey, 120);

        $otp = (string) random_int(100000, 999999);
        $cacheKey = OtpController::cacheKeyWithdrawUser((int) $user->id);
        Cache::put($cacheKey, [
            'code' => $otp,
            'expires_at' => now()->addMinutes(self::WITHDRAW_OTP_TTL_MINUTES)->timestamp,
        ], now()->addMinutes(self::WITHDRAW_OTP_TTL_MINUTES));

        Mail::to((string) $user->email)->send(new OtpMail($otp, 'Withdrawal verification'));

        return response()->json([
            'message' => 'OTP sent to your email.',
        ]);
    }

    /** Direct withdrawal debits main wallet only; 15% fee — net sent on-chain is gross − fee. */
    public function withdraw(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount_usd' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'bep20_address' => ['required', 'string', 'max:128', 'regex:/^0x[a-fA-F0-9]{40}$/'],
            'save_address' => ['sometimes', 'boolean'],
            'otp' => ['required', 'string', 'digits:6'],
        ]);

        $min = (string) config('wallet_display.min_withdraw_usd');
        $gross = number_format((float) $validated['amount_usd'], 2, '.', '');
        if (bccomp($gross, $min, 2) < 0) {
            throw ValidationException::withMessages(['amount_usd' => ["Minimum withdrawal request is {$min} USDT (gross from main wallet)."]]);
        }

        $feeRate = (string) config('wallet_display.direct_withdrawal_fee_rate');
        $fee = bcmul($gross, $feeRate, 2);
        $net = bcsub($gross, $fee, 2);

        return DB::transaction(function () use ($request, $validated, $gross, $fee, $net, $feeRate) {
            /** @var User $user */
            $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();

            if (! OtpController::verifyWithdrawUser((int) $user->id, (string) $validated['otp'])) {
                throw ValidationException::withMessages([
                    'otp' => ['Invalid or expired OTP. Please request a new OTP.'],
                ]);
            }

            if (bccomp((string) $user->wallet_balance, $gross, 2) < 0) {
                abort(422, 'Insufficient main wallet balance. Move funds from P2P to main first if needed.');
            }

            if (! empty($validated['save_address']) && $validated['save_address']) {
                $user->usdt_bep20_withdrawal_address = $validated['bep20_address'];
            }

            $newMain = bcsub((string) $user->wallet_balance, $gross, 2);
            $user->wallet_balance = $newMain;
            $user->save();

            WalletTransaction::create([
                'user_id' => $user->id,
                'type' => WalletTransaction::TYPE_WITHDRAWAL,
                'amount' => '-'.$gross,
                'balance_after' => $newMain,
                'meta' => [
                    'bep20_address' => $validated['bep20_address'],
                    'network' => config('wallet_display.network_label'),
                    'status' => 'queued',
                    'gross_usd' => $gross,
                    'fee_usd' => $fee,
                    'fee_rate' => $feeRate,
                    'net_sent_usd' => $net,
                    'p2p_balance_after' => (string) $user->p2p_wallet_balance,
                ],
            ]);

            return response()->json([
                'message' => 'Withdrawal recorded.',
                'wallet_balance' => $newMain,
                'p2p_wallet_balance' => (string) $user->p2p_wallet_balance,
                'gross_usd' => $gross,
                'fee_usd' => $fee,
                'net_sent_usd' => $net,
                'saved_withdrawal_address' => $user->usdt_bep20_withdrawal_address,
            ]);
        });
    }

    public function transactions(Request $request): JsonResponse
    {
        $perPage = min(50, max(5, (int) $request->integer('per_page', 20)));
        $query = WalletTransaction::where('user_id', $request->user()->id)->latest();

        if ($request->filled('types')) {
            $types = array_values(array_filter(array_map('trim', explode(',', (string) $request->query('types')))));
            if (count($types) > 0) {
                $query->whereIn('type', $types);
            }
        } elseif ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        $paginator = $query->paginate($perPage);

        $items = $paginator->items();
        $userMap = $this->loadUserSummariesForIds($this->relatedUserIdsFromTransactions($items));

        $data = [];
        foreach ($items as $t) {
            $data[] = $this->mapTransactionRow($t, $userMap);
        }

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function mapTransactions(int $userId): array
    {
        $col = WalletTransaction::where('user_id', $userId)
            ->latest()
            ->limit(25)
            ->get();

        $userMap = $this->loadUserSummariesForIds($this->relatedUserIdsFromTransactions($col));

        return $col->map(fn (WalletTransaction $t) => $this->mapTransactionRow($t, $userMap))->all();
    }

    /**
     * @param  iterable<int, WalletTransaction>  $transactions
     * @return list<int>
     */
    private function relatedUserIdsFromTransactions(iterable $transactions): array
    {
        $ids = [];
        foreach ($transactions as $t) {
            $m = $t->meta;
            if (! is_array($m)) {
                continue;
            }
            if (! empty($m['from_user_id'])) {
                $ids[] = (int) $m['from_user_id'];
            }
            if (! empty($m['to_user_id'])) {
                $ids[] = (int) $m['to_user_id'];
            }
        }

        return array_values(array_unique(array_filter($ids)));
    }

    /**
     * @param  list<int>  $ids
     * @return array<int, array{name: string, login_uid: string|null}>
     */
    private function loadUserSummariesForIds(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $map = [];
        foreach (User::query()->whereIn('id', $ids)->get(['id', 'name', 'login_uid']) as $u) {
            $map[(int) $u->id] = [
                'name' => trim((string) ($u->name ?? '')) !== '' ? trim((string) $u->name) : 'Member',
                'login_uid' => $u->login_uid !== null && (string) $u->login_uid !== '' ? (string) $u->login_uid : null,
            ];
        }

        return $map;
    }

    /**
     * @param  array<int, array{name: string, login_uid: string|null}>  $userMap
     */
    private function describeRelatedUser(array $userMap, ?int $userId, bool $withInternalId = false): string
    {
        if ($userId === null || $userId <= 0) {
            return '';
        }
        if (! isset($userMap[$userId])) {
            return 'member #'.$userId;
        }
        $u = $userMap[$userId];
        $line = $u['name'];
        if ($u['login_uid'] !== null && (string) $u['login_uid'] !== '') {
            $line .= ' · User ID '.(string) $u['login_uid'];
        }
        if ($withInternalId) {
            $line .= ' · #'.$userId;
        }

        return $line;
    }

    /**
     * @param  array<int, array{name: string, login_uid: string|null}>  $userMap
     */
    private function buildTransactionDetail(WalletTransaction $t, array $userMap): string
    {
        $m = is_array($t->meta) ? $t->meta : [];
        $from = isset($m['from_user_id']) ? (int) $m['from_user_id'] : null;
        $to = isset($m['to_user_id']) ? (int) $m['to_user_id'] : null;
        $whoFrom = $this->describeRelatedUser($userMap, $from > 0 ? $from : null, false);
        $whoTo = $this->describeRelatedUser($userMap, $to > 0 ? $to : null, false);
        $whoFromFull = $this->describeRelatedUser($userMap, $from > 0 ? $from : null, true);
        $whoToFull = $this->describeRelatedUser($userMap, $to > 0 ? $to : null, true);

        return match ($t->type) {
            WalletTransaction::TYPE_DEPOSIT_CREDIT => (function () use ($m) {
                $h = isset($m['tx_hash']) ? (string) $m['tx_hash'] : '';
                $net = isset($m['network']) ? (string) $m['network'] : '';
                $tail = $h !== '' ? ' · TX '.substr($h, 0, 14).'…' : '';

                return 'On-chain USDT deposit'.($net !== '' ? ' ('.$net.')' : '').$tail;
            })(),
            WalletTransaction::TYPE_WITHDRAWAL => (function () use ($m) {
                $net = $m['net_sent_usd'] ?? null;
                $s = 'Withdrawal to your BEP20 address';
                if ($net !== null && $net !== '') {
                    $s .= ' · net $'.(string) $net;
                }

                return $s;
            })(),
            WalletTransaction::TYPE_SURVEY_CREDIT => ! empty($m['survey_response_id'])
                ? 'Survey reward · response #'.(int) $m['survey_response_id']
                : (! empty($m['reference'])
                    ? 'Survey reward · '.(string) $m['reference']
                    : 'Survey wallet credit'),
            WalletTransaction::TYPE_DIRECT_COMMISSION => (function () use ($m, $whoFrom) {
                $src = (($m['source'] ?? '') === 'fee') ? 'their programme fee' : 'their survey earning';

                return $whoFrom !== ''
                    ? 'Direct income (10%) · from '.$whoFrom.' · on '.$src
                    : 'Direct income (10%) · '.$src;
            })(),
            WalletTransaction::TYPE_SURVEY_LEVEL_INCOME => (function () use ($m, $whoFrom) {
                $lv = isset($m['level']) ? (int) $m['level'] : null;
                $head = $lv !== null ? 'Survey level income · level '.$lv.' (1%)' : 'Survey level income';

                return $whoFrom !== '' ? $head.' · from '.$whoFrom."'s survey activity" : $head;
            })(),
            WalletTransaction::TYPE_PANEL_MATCHING => (function () use ($m) {
                $pairs = (int) ($m['pairs'] ?? 0);

                return 'Panel matching · '.$pairs.' pair'.($pairs === 1 ? '' : 's').' paid';
            })(),
            WalletTransaction::TYPE_SUB_PANEL_MATCHING => (function () use ($m) {
                $panels = $m['milestone_panels'] ?? $m['cumulative_matched_panels'] ?? null;

                return $panels !== null && $panels !== ''
                    ? 'Sub-panel matching · milestone at '.$panels.' matching panels'
                    : 'Sub-panel matching payout';
            })(),
            WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING => (function () use ($m) {
                $panels = $m['milestone_panels'] ?? $m['cumulative_matched_panels'] ?? null;

                return $panels !== null && $panels !== ''
                    ? 'Super panel matching · milestone at '.$panels.' panels'
                    : 'Super panel matching payout';
            })(),
            WalletTransaction::TYPE_P2P_TRANSFER_IN => (function () use ($m, $whoFromFull) {
                if ($whoFromFull !== '') {
                    return 'P2P received · from '.$whoFromFull;
                }
                $name = trim((string) ($m['from_name'] ?? ''));
                $uid = isset($m['from_login_uid']) ? trim((string) $m['from_login_uid']) : '';
                $fid = isset($m['from_user_id']) ? (int) $m['from_user_id'] : 0;
                $parts = [];
                if ($name !== '') {
                    $parts[] = $name;
                }
                if ($uid !== '') {
                    $parts[] = 'User ID '.$uid;
                }
                if ($fid > 0) {
                    $parts[] = '#'.$fid;
                }
                if ($parts !== []) {
                    return 'P2P received · from '.implode(' · ', $parts);
                }

                return ! empty($m['from_email'])
                    ? 'P2P received · from '.(string) $m['from_email']
                    : 'P2P received';
            })(),
            WalletTransaction::TYPE_P2P_TRANSFER_OUT => (function () use ($m, $whoToFull) {
                if ($whoToFull !== '') {
                    return 'P2P sent · to '.$whoToFull;
                }
                $name = trim((string) ($m['to_name'] ?? ''));
                $uid = isset($m['to_login_uid']) ? trim((string) $m['to_login_uid']) : '';
                $tid = isset($m['to_user_id']) ? (int) $m['to_user_id'] : 0;
                $parts = [];
                if ($name !== '') {
                    $parts[] = $name;
                }
                if ($uid !== '') {
                    $parts[] = 'User ID '.$uid;
                }
                if ($tid > 0) {
                    $parts[] = '#'.$tid;
                }
                if ($parts !== []) {
                    return 'P2P sent · to '.implode(' · ', $parts);
                }

                return ! empty($m['to_email'])
                    ? 'P2P sent · to '.(string) $m['to_email']
                    : 'P2P sent';
            })(),
            WalletTransaction::TYPE_MAIN_TO_P2P => (function () use ($m) {
                $b = $m['credited_to_p2p_usd'] ?? null;

                return $b !== null && $b !== ''
                    ? 'Main → P2P · credited $'.(string) $b.' to P2P (incl. bonus)'
                    : 'Main → P2P wallet transfer';
            })(),
            WalletTransaction::TYPE_P2P_TO_MAIN => (function () use ($m) {
                $a = $m['from_p2p_usd'] ?? null;

                return $a !== null && $a !== ''
                    ? 'P2P → Main · moved $'.(string) $a.' to main wallet'
                    : 'P2P → Main wallet transfer';
            })(),
            WalletTransaction::TYPE_PLAN_PURCHASE => 'Plan purchase · '.(isset($m['plan_name']) ? (string) $m['plan_name'] : 'plan'),
            WalletTransaction::TYPE_ACTIVATION_FEE => 'Activation fee (wallet debit)',
            WalletTransaction::TYPE_MINIMUM_PANEL_FEE => 'Minimum panel fee (wallet debit)',
            WalletTransaction::TYPE_SUB_PANEL_FEE => (function () use ($m) {
                $ix = isset($m['panel_index']) ? (int) $m['panel_index'] : null;

                return $ix !== null && $ix > 0 ? 'Sub-panel slot #'.$ix.' · entry fee' : 'Sub-panel entry fee';
            })(),
            WalletTransaction::TYPE_SUPER_SUB_PANEL_FEE => (function () use ($m) {
                $ix = isset($m['panel_index']) ? (int) $m['panel_index'] : null;

                return $ix !== null && $ix > 0 ? 'Super panel slot #'.$ix.' · entry fee' : 'Super panel entry fee';
            })(),
            default => ucfirst(str_replace('_', ' ', $t->type)),
        };
    }

    /**
     * Other party for P2P leg (for UI: name, login UID, internal user id).
     *
     * @param  array<int, array{name: string, login_uid: string|null}>  $userMap
     * @return array{user_id: int, login_uid: string|null, name: string|null}|null
     */
    private function p2pCounterpartyPayload(WalletTransaction $t, array $userMap): ?array
    {
        $m = is_array($t->meta) ? $t->meta : [];
        $cid = 0;
        if ($t->type === WalletTransaction::TYPE_P2P_TRANSFER_OUT && ! empty($m['to_user_id'])) {
            $cid = (int) $m['to_user_id'];
        } elseif ($t->type === WalletTransaction::TYPE_P2P_TRANSFER_IN && ! empty($m['from_user_id'])) {
            $cid = (int) $m['from_user_id'];
        }
        if ($cid <= 0) {
            return null;
        }
        if (isset($userMap[$cid])) {
            return [
                'user_id' => $cid,
                'login_uid' => $userMap[$cid]['login_uid'],
                'name' => $userMap[$cid]['name'],
            ];
        }

        $uid = null;
        $name = null;
        if ($t->type === WalletTransaction::TYPE_P2P_TRANSFER_OUT) {
            $rawUid = $m['to_login_uid'] ?? null;
            $uid = $rawUid !== null && (string) $rawUid !== '' ? (string) $rawUid : null;
            $name = trim((string) ($m['to_name'] ?? '')) !== '' ? trim((string) $m['to_name']) : null;
        } else {
            $rawUid = $m['from_login_uid'] ?? null;
            $uid = $rawUid !== null && (string) $rawUid !== '' ? (string) $rawUid : null;
            $name = trim((string) ($m['from_name'] ?? '')) !== '' ? trim((string) $m['from_name']) : null;
        }

        return [
            'user_id' => $cid,
            'login_uid' => $uid,
            'name' => $name,
        ];
    }

    /**
     * @param  array<int, array{name: string, login_uid: string|null}>  $userMap
     * @return array<string, mixed>
     */
    private function mapTransactionRow(WalletTransaction $t, array $userMap = []): array
    {
        $metaSummary = null;
        if ($t->type === WalletTransaction::TYPE_DEPOSIT_CREDIT && isset($t->meta['tx_hash'])) {
            $metaSummary = 'TX '.substr((string) $t->meta['tx_hash'], 0, 10).'…';
        } elseif ($t->type === WalletTransaction::TYPE_WITHDRAWAL) {
            $metaSummary = isset($t->meta['net_sent_usd'])
                ? 'Net '.(string) $t->meta['net_sent_usd']
                : (isset($t->meta['bep20_address']) ? substr((string) $t->meta['bep20_address'], 0, 10).'…' : null);
        } elseif (in_array($t->type, [WalletTransaction::TYPE_P2P_TRANSFER_OUT, WalletTransaction::TYPE_P2P_TRANSFER_IN], true)) {
            $m = is_array($t->meta) ? $t->meta : [];
            if ($t->type === WalletTransaction::TYPE_P2P_TRANSFER_OUT) {
                $u = isset($m['to_login_uid']) ? trim((string) $m['to_login_uid']) : '';
                $metaSummary = $u !== '' ? 'P2P → '.$u : 'P2P out';
            } else {
                $u = isset($m['from_login_uid']) ? trim((string) $m['from_login_uid']) : '';
                $metaSummary = $u !== '' ? 'P2P ← '.$u : 'P2P in';
            }
        } elseif ($t->type === WalletTransaction::TYPE_MAIN_TO_P2P) {
            $metaSummary = 'Main→P2P';
        } elseif ($t->type === WalletTransaction::TYPE_P2P_TO_MAIN) {
            $metaSummary = 'P2P→Main';
        } elseif ($t->type === WalletTransaction::TYPE_PLAN_PURCHASE) {
            $metaSummary = isset($t->meta['plan_name']) ? (string) $t->meta['plan_name'] : 'Plan';
        }

        $p2pCp = null;
        if (in_array($t->type, [WalletTransaction::TYPE_P2P_TRANSFER_OUT, WalletTransaction::TYPE_P2P_TRANSFER_IN], true)) {
            $p2pCp = $this->p2pCounterpartyPayload($t, $userMap);
        }

        return [
            'id' => $t->id,
            'type' => $t->type,
            'amount' => (string) $t->amount,
            'balance_after' => (string) $t->balance_after,
            'created_at' => $t->created_at?->toIso8601String(),
            'meta' => $t->meta,
            'meta_summary' => $metaSummary,
            'detail' => $this->buildTransactionDetail($t, $userMap),
            'p2p_counterparty' => $p2pCp,
        ];
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PublisherTransaction;
use App\Services\WalletService;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function __construct(
        private WalletService $walletService
    ) {}

    public function index(Request $request)
    {
        $publisherId = $request->user()->id;

        $transactions = PublisherTransaction::query()
            ->where('user_id', $publisherId)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return response()->json(['transactions' => $transactions]);
    }

    public function withdraw(Request $request)
    {
        $data = $request->validate([
            'amountUsd' => 'required|numeric|min:1',
            'description' => 'nullable|string|max:500',
        ]);

        $user = $request->user();

        $result = $this->walletService->requestWithdrawal(
            $user,
            (float) $data['amountUsd'],
            $data['description'] ?? null
        );

        return response()->json([
            'transaction' => $result['transaction'],
            'balanceUsd' => (float) $result['wallet']->balance,
        ], 201);
    }
}

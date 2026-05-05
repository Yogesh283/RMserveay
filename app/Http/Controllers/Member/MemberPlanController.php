<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MemberPlanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $plans = config('membership_plans.plans', []);
        $tier = (int) $user->membership_tier;
        $owned = [];
        for ($i = 0; $i < $tier && $i < count($plans); $i++) {
            $owned[] = $plans[$i];
        }
        $nextUpgrade = isset($plans[$tier]) ? $plans[$tier] : null;

        return response()->json([
            'membership_tier' => $tier,
            'owned_plans' => $owned,
            'next_upgrade' => $nextUpgrade,
            'all_plans' => $plans,
            'plan_count' => count($plans),
            'at_max_tier' => $tier >= count($plans),
        ]);
    }

    public function purchase(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_slug' => ['required', 'string', 'max:64'],
        ]);

        $plans = config('membership_plans.plans', []);
        if ($plans === []) {
            return response()->json(['message' => 'No plans configured.'], 422);
        }

        /** @var User $locked */
        $locked = User::whereKey($request->user()->id)->firstOrFail();
        $tier = (int) $locked->membership_tier;

        if ($tier >= count($plans)) {
            return response()->json(['message' => 'You already hold the highest plan.'], 422);
        }

        $expected = $plans[$tier];
        if ($expected['slug'] !== $validated['plan_slug']) {
            return response()->json([
                'message' => 'Purchase the next plan in sequence only.',
                'expected_slug' => $expected['slug'],
            ], 422);
        }

        $price = number_format((float) $expected['price_usd'], 2, '.', '');
        if (bccomp((string) $locked->wallet_balance, $price, 2) < 0) {
            return response()->json(['message' => 'Insufficient main wallet balance.'], 422);
        }

        return DB::transaction(function () use ($request, $expected, $price, $tier) {
            /** @var User $user */
            $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            if ((int) $user->membership_tier !== $tier) {
                return response()->json(['message' => 'Plan state changed. Refresh and try again.'], 409);
            }
            if (bccomp((string) $user->wallet_balance, $price, 2) < 0) {
                return response()->json(['message' => 'Insufficient main wallet balance.'], 422);
            }

            $newMain = bcsub((string) $user->wallet_balance, $price, 2);
            $user->wallet_balance = $newMain;
            $user->membership_tier = $tier + 1;
            $user->save();

            WalletTransaction::create([
                'user_id' => $user->id,
                'type' => WalletTransaction::TYPE_PLAN_PURCHASE,
                'amount' => '-'.$price,
                'balance_after' => $newMain,
                'meta' => [
                    'plan_slug' => $expected['slug'],
                    'plan_name' => $expected['name'],
                ],
            ]);

            return response()->json([
                'message' => 'Plan purchased successfully.',
                'membership_tier' => $user->membership_tier,
                'wallet_balance' => $newMain,
            ]);
        });
    }
}

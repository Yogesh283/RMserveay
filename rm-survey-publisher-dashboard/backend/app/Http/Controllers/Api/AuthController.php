<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'company' => 'nullable|string|max:255',
        ]);

        $user = DB::transaction(function () use ($data) {
            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => 'publisher',
                'company' => $data['company'] ?? null,
                'payment_details' => [],
                'notification_prefs' => [
                    'email' => true,
                    'push' => true,
                    'earnings' => true,
                    'surveyComplete' => true,
                ],
            ]);

            Wallet::query()->create([
                'user_id' => $user->id,
                'balance' => 0,
                'currency' => 'USD',
            ]);

            return $user;
        });

        $token = $user->createToken('publisher')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->userSummary($user),
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::query()->where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials'],
            ]);
        }

        if ($user->role !== 'publisher') {
            abort(403, 'Publisher access only');
        }

        $token = $user->createToken('publisher')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->userSummary($user),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('wallet');

        return response()->json([
            'user' => $this->userDetail($user),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'company' => 'nullable|string|max:255',
            'payment_details' => 'sometimes|array',
            'paymentDetails' => 'sometimes|array',
            'notification_prefs' => 'sometimes|array',
            'notificationPrefs' => 'sometimes|array',
        ]);

        if (isset($data['name'])) {
            $user->name = $data['name'];
        }
        if (array_key_exists('company', $data)) {
            $user->company = $data['company'];
        }

        $paymentPatch = $data['payment_details'] ?? $data['paymentDetails'] ?? null;
        if (is_array($paymentPatch)) {
            $user->payment_details = array_merge($user->payment_details ?? [], $paymentPatch);
        }

        $notifPatch = $data['notification_prefs'] ?? $data['notificationPrefs'] ?? null;
        if (is_array($notifPatch)) {
            $user->notification_prefs = array_merge($user->notification_prefs ?? [], $notifPatch);
        }
        $user->save();

        return response()->json(['user' => $this->userDetail($user->fresh('wallet'))]);
    }

    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'currentPassword' => 'required|string',
            'newPassword' => 'required|string|min:6',
        ]);

        $user = $request->user();

        if (! Hash::check($data['currentPassword'], $user->password)) {
            abort(422, 'Current password is incorrect');
        }

        $user->password = $data['newPassword'];
        $user->save();

        return response()->json(['message' => 'Password updated']);
    }

    private function userSummary(User $user): array
    {
        $user->loadMissing('wallet');

        return [
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'company' => $user->company,
            'balanceUsd' => $user->wallet ? (float) $user->wallet->balance : 0.0,
        ];
    }

    private function userDetail(User $user): array
    {
        $user->loadMissing('wallet');

        return [
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'company' => $user->company,
            'balanceUsd' => $user->wallet ? (float) $user->wallet->balance : 0.0,
            'wallet' => $user->wallet ? [
                'id' => $user->wallet->id,
                'balance' => (float) $user->wallet->balance,
                'currency' => $user->wallet->currency,
            ] : null,
            'paymentDetails' => $user->payment_details,
            'notificationPrefs' => $user->notification_prefs,
            'createdAt' => $user->created_at?->toIso8601String(),
        ];
    }
}

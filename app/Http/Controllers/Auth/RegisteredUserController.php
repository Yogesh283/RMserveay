<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterUserRequest;
use App\Models\User;
use App\Services\BinaryPlacementService;
use App\Support\DashboardRoute;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RegisteredUserController extends Controller
{
    public function store(RegisterUserRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $email = strtolower($validated['email']);

        if (! config('otp.bypass') && ! OtpController::verifyRegisterNonce(
            (string) ($validated['register_nonce'] ?? ''),
            $validated['otp'] ?? ''
        )) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid or expired OTP. Request a new code.'],
            ]);
        }

        return DB::transaction(function () use ($request, $validated, $email) {
            $placement = null;
            $sponsor = null;
            $code = $validated['sponsor_referral_code'] ?? null;
            $side = $validated['binary_side'] ?? null;

            if ($code) {
                $sponsor = User::query()->where('referral_code', $code)->lockForUpdate()->first();
                if (! $sponsor) {
                    throw ValidationException::withMessages([
                        'sponsor_referral_code' => ['Invalid referral code.'],
                    ]);
                }
                if ($side === 'left' || $side === 'right') {
                    $placement = app(BinaryPlacementService::class)->findAvailableSlotInLeg($sponsor, $side);
                    if ($placement === null) {
                        throw ValidationException::withMessages([
                            'binary_side' => ['No placement slot found for this sponsor leg.'],
                        ]);
                    }
                }
            }

            $user = User::create([
                'name' => $validated['name'],
                'email' => $email,
                'login_uid' => $validated['login_uid'],
                'password' => $validated['password'],
                'user_type' => $validated['user_type'],
                'phone' => $validated['phone'] ?? null,
                'referral_code' => User::generateReferralCode(),
                'sponsor_id' => $sponsor?->id,
                'binary_parent_id' => $placement['parent']->id ?? null,
                'binary_side' => $placement['side'] ?? null,
                'profile_completed_at' => now(),
            ]);

            if ($placement !== null) {
                /** @var User $parent */
                $parent = $placement['parent'];
                if ($placement['side'] === 'left') {
                    $parent->left_child_id = $user->id;
                } else {
                    $parent->right_child_id = $user->id;
                }
                $parent->save();
            }

            event(new Registered($user));

            Auth::login($user);

            if ($request->hasSession()) {
                $request->session()->regenerate();
                $request->session()->put('app_login_user_type', $validated['user_type']);
            }

            $user = $user->fresh();

            return response()->json([
                'user' => $user->toApiArray(),
                'redirect_to' => DashboardRoute::forAppRole($validated['user_type']),
                'placement' => $side ? ['binary_side' => $side, 'sponsor_referral_code' => $code] : null,
            ], 201);
        });
    }
}

<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterUserRequest;
use App\Models\User;
use App\Services\SponsorPlacementService;
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
            $placementSvc = app(SponsorPlacementService::class);
            $code = isset($validated['sponsor_referral_code'])
                ? trim((string) $validated['sponsor_referral_code'])
                : '';
            $side = $validated['binary_side'] ?? null;

            $resolved = $placementSvc->resolvePlacementForRegistration(
                $code !== '' ? $code : null,
                $side
            );

            User::whereKey($resolved['sponsor']->id)->lockForUpdate()->firstOrFail();

            $placement = $resolved['placement'];
            $effectiveSide = $resolved['binary_side'];

            $user = User::create([
                'name' => $validated['name'],
                'email' => $email,
                'login_uid' => $validated['login_uid'],
                'password' => $validated['password'],
                'user_type' => $validated['user_type'],
                'phone' => $validated['phone'] ?? null,
                'referral_code' => User::generateReferralCode(),
                'sponsor_id' => $resolved['sponsor']->id,
                'binary_parent_id' => $placement['parent']->id ?? null,
                'binary_side' => $placement['side'] ?? null,
                'profile_completed_at' => now(),
            ]);

            if ($placement !== null) {
                $placementSvc->attachUserToPlacement($user, $resolved['sponsor'], $placement);
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
                'placement' => $effectiveSide
                    ? [
                        'binary_side' => $effectiveSide,
                        'sponsor_referral_code' => $resolved['sponsor_referral_code'],
                    ]
                    : null,
            ], 201);
        });
    }
}

<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use App\Support\SessionAuthStamp;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserRegistrationService
{
    public function __construct(
        protected SponsorPlacementService $sponsorPlacement,
    ) {}

    /**
     * Create user + sponsor placement from validated registration payload (same shape as RegisterUserRequest).
     *
     * @param  array<string, mixed>  $validated
     */
    public function register(Request $request, array $validated): User
    {
        $email = strtolower($validated['email']);

        return DB::transaction(function () use ($request, $validated, $email) {
            $code = isset($validated['sponsor_referral_code'])
                ? trim((string) $validated['sponsor_referral_code'])
                : '';
            $side = $validated['binary_side'] ?? null;

            $resolved = $this->sponsorPlacement->resolvePlacementForRegistration(
                $code !== '' ? $code : null,
                $side
            );

            User::whereKey($resolved['sponsor']->id)->lockForUpdate()->firstOrFail();

            $placement = $resolved['placement'];

            $user = User::create([
                'name' => $validated['name'],
                'email' => $email,
                'password' => $validated['password'],
                'user_type' => $validated['user_type'],
                'profile' => $validated['profile'] ?? null,
                'qualification' => $validated['qualification'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'referral_code' => User::generateReferralCode(),
                'sponsor_id' => $resolved['sponsor']->id,
                'binary_parent_id' => $placement['parent']->id ?? null,
                'binary_side' => $placement['side'] ?? null,
                'profile_completed_at' => now(),
            ]);

            if ($placement !== null) {
                $this->sponsorPlacement->attachUserToPlacement($user, $resolved['sponsor'], $placement);
            }

            event(new Registered($user));

            Auth::login($user);

            if ($request->hasSession()) {
                $request->session()->regenerate();
                $request->session()->put('app_login_user_type', $validated['user_type']);
                SessionAuthStamp::stamp($request);
            }

            return $user->fresh();
        });
    }
}

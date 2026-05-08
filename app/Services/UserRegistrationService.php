<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UserRegistrationService
{
    /**
     * Create user + sponsor placement from validated registration payload (same shape as RegisterUserRequest).
     *
     * @param  array<string, mixed>  $validated
     */
    public function register(Request $request, array $validated): User
    {
        $email = strtolower($validated['email']);

        return DB::transaction(function () use ($request, $validated, $email) {
            $placement = null;
            $sponsor = null;
            $code = isset($validated['sponsor_referral_code']) ? strtoupper(trim((string) $validated['sponsor_referral_code'])) : null;
            $side = $validated['binary_side'] ?? null;

            if ($code) {
                $sponsor = User::where('referral_code', $code)->lockForUpdate()->first();
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
                'password' => $validated['password'],
                'user_type' => $validated['user_type'],
                'profile' => $validated['profile'] ?? null,
                'qualification' => $validated['qualification'] ?? null,
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

            return $user->fresh();
        });
    }
}

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
                if ($side === 'left' && $sponsor->left_child_id) {
                    throw ValidationException::withMessages([
                        'binary_side' => ['Left position is already filled for this sponsor.'],
                    ]);
                }
                if ($side === 'right' && $sponsor->right_child_id) {
                    throw ValidationException::withMessages([
                        'binary_side' => ['Right position is already filled for this sponsor.'],
                    ]);
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
                'binary_parent_id' => $sponsor?->id,
                'binary_side' => $side,
                'profile_completed_at' => now(),
            ]);

            if ($sponsor && $side) {
                if ($side === 'left') {
                    $sponsor->left_child_id = $user->id;
                } else {
                    $sponsor->right_child_id = $user->id;
                }
                $sponsor->save();
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

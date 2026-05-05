<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\CompleteUnifiedProfileRequest;
use App\Http\Requests\Auth\CompleteUnifiedRegistrationRequest;
use App\Models\User;
use App\Services\UserRegistrationService;
use App\Support\DashboardRoute;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UnifiedAuthController extends Controller
{
    private const REG_PREFIX = 'unified_reg:';

    private const REG_TTL_MINUTES = 45;

    public static function registrationCacheKey(string $token): string
    {
        return self::REG_PREFIX.$token;
    }

    /**
     * Step 1 → send email OTP (sign up uses register purpose; sign in uses login purpose).
     */
    public function sendOtp(Request $request, OtpController $otp): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'user_type' => ['required', 'string', 'in:normal,publisher'],
            'mode' => ['required', 'string', 'in:sign_in,sign_up'],
        ]);

        $email = strtolower($validated['email']);
        $purpose = $validated['mode'] === 'sign_up' ? 'register' : 'login';

        if ($validated['mode'] === 'sign_up' && User::where('email', $email)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['An account with this email already exists. Sign in instead.'],
            ]);
        }

        if ($validated['mode'] === 'sign_in' && ! User::where('email', $email)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['No account found for this email. Create an account first.'],
            ]);
        }

        return $otp->issue($email, $purpose, $request);
    }

    /**
     * Step 2 → verify OTP. Sign up returns a registration_token (profile step). Sign in logs in or asks for profile completion.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'otp' => ['nullable', 'string'],
            'user_type' => ['required', 'string', 'in:normal,publisher'],
            'mode' => ['required', 'string', 'in:sign_in,sign_up'],
            'phone' => ['nullable', 'string', 'max:32'],
        ]);

        $email = strtolower($validated['email']);
        $mode = $validated['mode'];
        $purpose = $mode === 'sign_up' ? 'register' : 'login';
        $otp = $validated['otp'] ?? '';

        if (! config('otp.bypass')) {
            if (strlen($otp) !== 6 || ! preg_match('/^[0-9]{6}$/', $otp)) {
                throw ValidationException::withMessages([
                    'otp' => ['Enter the 6-digit code from your email.'],
                ]);
            }
            if (! OtpController::verify($purpose, $email, $otp)) {
                throw ValidationException::withMessages([
                    'otp' => ['Invalid or expired OTP. Request a new code.'],
                ]);
            }
        }

        if ($mode === 'sign_up') {
            $token = (string) Str::uuid();
            Cache::put(self::registrationCacheKey($token), [
                'email' => $email,
                'user_type' => $validated['user_type'],
                'phone' => $validated['phone'] ?? null,
                'expires_at' => now()->addMinutes(self::REG_TTL_MINUTES)->timestamp,
            ], now()->addMinutes(self::REG_TTL_MINUTES));

            return response()->json([
                'step' => 'profile',
                'registration_token' => $token,
                'user_type' => $validated['user_type'],
                'email' => $email,
                'prefill_phone' => $validated['phone'] ?? null,
            ]);
        }

        $user = User::where('email', $email)->first();
        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['No account found for this email.'],
            ]);
        }

        Auth::login($user);

        if ($request->hasSession()) {
            $request->session()->regenerate();
            $request->session()->put('app_login_user_type', $validated['user_type']);
        }

        $role = $validated['user_type'];

        if (! $user->fresh()->hasCompletedProfile()) {
            return response()->json([
                'step' => 'profile',
                'needs_profile_completion' => true,
                'user' => $request->user()?->toApiArray(),
                'redirect_to' => DashboardRoute::forAppRole($role),
            ]);
        }

        return response()->json([
            'step' => 'dashboard',
            'user' => $request->user()?->fresh()->toApiArray(),
            'redirect_to' => DashboardRoute::forAppRole($role),
        ]);
    }

    /**
     * Step 3 (sign up) — create account after OTP was verified (registration_token proves it).
     */
    public function completeRegistration(CompleteUnifiedRegistrationRequest $request, UserRegistrationService $registration): JsonResponse
    {
        $payload = $request->validated();
        $token = $payload['registration_token'];
        $cache = Cache::pull(self::registrationCacheKey($token));

        if (! is_array($cache) || empty($cache['email'])) {
            throw ValidationException::withMessages([
                'registration_token' => ['Session expired. Start again from the email step.'],
            ]);
        }

        if (($cache['expires_at'] ?? 0) < now()->timestamp) {
            throw ValidationException::withMessages([
                'registration_token' => ['Session expired. Verify your email again.'],
            ]);
        }

        $email = strtolower((string) $cache['email']);
        if (User::where('email', $email)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['This email was registered while you were completing the form. Sign in instead.'],
            ]);
        }

        if (($cache['user_type'] ?? null) !== $payload['user_type']) {
            throw ValidationException::withMessages([
                'user_type' => ['Account type does not match the one you selected earlier.'],
            ]);
        }

        $validated = [
            'user_type' => $payload['user_type'],
            'name' => $payload['name'],
            'email' => $email,
            'password' => $payload['password'],
            'password_confirmation' => $payload['password_confirmation'],
            'profile' => $payload['profile'] ?? null,
            'qualification' => $payload['qualification'] ?? null,
            'phone' => $payload['phone'] ?? $cache['phone'] ?? null,
            'sponsor_referral_code' => $payload['sponsor_referral_code'] ?? null,
            'binary_side' => $payload['binary_side'] ?? null,
        ];

        $user = $registration->register($request, $validated);

        return response()->json([
            'step' => 'dashboard',
            'user' => $user->toApiArray(),
        ], 201);
    }

    /**
     * Step 3 (sign in) — finish profile for accounts flagged incomplete.
     */
    public function completeProfile(CompleteUnifiedProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $data = $request->validated();
        $user->fill([
            'name' => $data['name'],
            'profile' => $data['profile'] ?? null,
            'qualification' => $data['qualification'] ?? null,
            'phone' => $data['phone'] ?? null,
            'profile_completed_at' => now(),
        ]);
        $user->save();

        $role = session('app_login_user_type');
        $role = is_string($role) && in_array($role, ['normal', 'publisher'], true)
            ? $role
            : ($user->user_type ?? 'normal');

        return response()->json([
            'step' => 'dashboard',
            'user' => $user->fresh()->toApiArray(),
            'redirect_to' => DashboardRoute::forAppRole($role),
        ]);
    }
}

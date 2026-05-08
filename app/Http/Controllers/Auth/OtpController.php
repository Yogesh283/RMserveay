<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\OtpMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class OtpController extends Controller
{
    private const OTP_TTL_MINUTES = 10;

    public function send(Request $request): JsonResponse
    {
        if ($request->filled('login_uid')) {
            $request->merge([
                'login_uid' => strtolower(trim((string) $request->input('login_uid'))),
            ]);
        }

        $validated = $request->validate([
            'purpose' => ['required', 'string', 'in:register,login,password_reset'],
            'email' => ['required_if:purpose,register', 'nullable', 'string', 'email', 'max:255'],
            'login_uid' => ['required_if:purpose,login', 'required_if:purpose,password_reset', 'nullable', 'string', 'exists:users,login_uid'],
            'register_nonce' => ['required_if:purpose,register', 'nullable', 'string', 'uuid'],
        ]);

        if ($validated['purpose'] === 'login') {
            return $this->issueLogin((string) $validated['login_uid'], $request);
        }

        if ($validated['purpose'] === 'password_reset') {
            return $this->issuePasswordReset((string) $validated['login_uid'], $request);
        }

        return $this->issueRegister(
            strtolower((string) $validated['email']),
            (string) $validated['register_nonce'],
            $request
        );
    }

    /**
     * Issue login OTP for a specific account (matched by unique login_uid).
     */
    public function issueLogin(string $loginUid, Request $request): JsonResponse
    {
        $user = User::query()->where('login_uid', strtolower(trim($loginUid)))->firstOrFail();

        $rateKey = 'otp-send:login-uid:'.$user->id.'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($rateKey, 5)) {
            throw ValidationException::withMessages([
                'login_uid' => ['Too many OTP requests. Try again in a few minutes.'],
            ]);
        }
        RateLimiter::hit($rateKey, 120);

        $otp = (string) random_int(100000, 999999);

        $cacheKey = self::cacheKeyLoginUser($user->id);
        Cache::put($cacheKey, [
            'code' => $otp,
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES)->timestamp,
        ], now()->addMinutes(self::OTP_TTL_MINUTES));

        Mail::to($user->email)->send(new OtpMail($otp, 'Sign in'));

        return response()->json([
            'message' => 'OTP sent to your email.',
        ]);
    }

    /**
     * Issue password-reset OTP (separate cache from login OTP).
     */
    public function issuePasswordReset(string $loginUid, Request $request): JsonResponse
    {
        $user = User::query()->where('login_uid', strtolower(trim($loginUid)))->firstOrFail();

        $rateKey = 'otp-send:password-reset-uid:'.$user->id.'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($rateKey, 5)) {
            throw ValidationException::withMessages([
                'login_uid' => ['Too many OTP requests. Try again in a few minutes.'],
            ]);
        }
        RateLimiter::hit($rateKey, 120);

        $otp = (string) random_int(100000, 999999);

        $cacheKey = self::cacheKeyPasswordResetUser($user->id);
        Cache::put($cacheKey, [
            'code' => $otp,
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES)->timestamp,
        ], now()->addMinutes(self::OTP_TTL_MINUTES));

        Mail::to($user->email)->send(new OtpMail($otp, 'Password reset'));

        return response()->json([
            'message' => 'OTP sent to your email.',
        ]);
    }

    /**
     * Issue registration OTP; keyed by register_nonce so duplicate emails do not share one OTP bucket.
     */
    public function issueRegister(string $email, string $registerNonce, Request $request): JsonResponse
    {
        $rateKey = 'otp-send:register:'.$registerNonce.'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($rateKey, 5)) {
            throw ValidationException::withMessages([
                'email' => ['Too many OTP requests. Try again in a few minutes.'],
            ]);
        }
        RateLimiter::hit($rateKey, 120);

        $otp = (string) random_int(100000, 999999);

        $cacheKey = self::cacheKeyRegisterNonce($registerNonce);
        Cache::put($cacheKey, [
            'code' => $otp,
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES)->timestamp,
        ], now()->addMinutes(self::OTP_TTL_MINUTES));

        Mail::to($email)->send(new OtpMail($otp, 'Registration'));

        return response()->json([
            'message' => 'OTP sent to your email.',
        ]);
    }

    /**
     * Legacy helper — kept for any code that still issues by email + purpose (same cache shape as before).
     *
     * @deprecated Prefer issueLogin / issueRegister
     */
    public function issue(string $email, string $purpose, Request $request): JsonResponse
    {
        if ($purpose === 'login') {
            $user = User::query()->where('email', strtolower($email))->first();
            if (! $user) {
                throw ValidationException::withMessages([
                    'email' => ['No account found for this email.'],
                ]);
            }

            return $this->issueLogin((string) $user->login_uid, $request);
        }

        throw ValidationException::withMessages([
            'register_nonce' => ['Registration OTP requires register_nonce. Use the updated registration flow.'],
        ]);
    }

    public static function cacheKey(string $purpose, string $email): string
    {
        return 'otp:'.$purpose.':'.hash('sha256', strtolower($email));
    }

    public static function cacheKeyRegisterNonce(string $nonce): string
    {
        return 'otp:register:nonce:'.hash('sha256', $nonce);
    }

    public static function cacheKeyLoginUser(int $userId): string
    {
        return 'otp:login:user:'.$userId;
    }

    public static function cacheKeyPasswordResetUser(int $userId): string
    {
        return 'otp:password_reset:user:'.$userId;
    }

    public static function cacheKeyWithdrawUser(int $userId): string
    {
        return 'otp:withdraw:user:'.$userId;
    }

    public static function cacheKeyEmailChangeUser(int $userId, string $newEmail): string
    {
        return 'otp:email_change:user:'.$userId.':'.hash('sha256', strtolower(trim($newEmail)));
    }

    public static function cacheKeyPasswordChangeUser(int $userId): string
    {
        return 'otp:password_change:user:'.$userId;
    }

    public static function verify(string $purpose, string $email, string $submittedOtp): bool
    {
        return self::verifyWithKey(self::cacheKey($purpose, $email), $submittedOtp);
    }

    public static function verifyRegisterNonce(string $nonce, string $submittedOtp): bool
    {
        return self::verifyWithKey(self::cacheKeyRegisterNonce($nonce), $submittedOtp);
    }

    public static function verifyLoginUser(int $userId, string $submittedOtp): bool
    {
        return self::verifyWithKey(self::cacheKeyLoginUser($userId), $submittedOtp);
    }

    public static function verifyPasswordResetUser(int $userId, string $submittedOtp): bool
    {
        return self::verifyWithKey(self::cacheKeyPasswordResetUser($userId), $submittedOtp);
    }

    public static function verifyWithdrawUser(int $userId, string $submittedOtp): bool
    {
        return self::verifyWithKey(self::cacheKeyWithdrawUser($userId), $submittedOtp);
    }

    public static function verifyEmailChangeUser(int $userId, string $newEmail, string $submittedOtp): bool
    {
        return self::verifyWithKey(self::cacheKeyEmailChangeUser($userId, $newEmail), $submittedOtp);
    }

    public static function verifyPasswordChangeUser(int $userId, string $submittedOtp): bool
    {
        return self::verifyWithKey(self::cacheKeyPasswordChangeUser($userId), $submittedOtp);
    }

    private static function verifyWithKey(string $key, string $submittedOtp): bool
    {
        $payload = Cache::get($key);
        if (! is_array($payload) || empty($payload['code'])) {
            return false;
        }
        if (($payload['expires_at'] ?? 0) < now()->timestamp) {
            Cache::forget($key);

            return false;
        }
        if ($payload['code'] !== $submittedOtp) {
            return false;
        }
        Cache::forget($key);

        return true;
    }
}

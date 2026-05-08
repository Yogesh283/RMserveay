<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Auth\OtpController;
use App\Http\Controllers\Controller;
use App\Http\Requests\Member\UpdateMemberProfileRequest;
use App\Mail\OtpMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class MemberProfileController extends Controller
{
    private const EMAIL_OTP_TTL_MINUTES = 10;
    private const PASSWORD_OTP_TTL_MINUTES = 10;

    public function sendEmailChangeOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
        ]);

        $user = $request->user();
        $nextEmail = strtolower(trim((string) $validated['email']));

        if (strcasecmp((string) $user->email, $nextEmail) === 0) {
            throw ValidationException::withMessages([
                'email' => ['This email is already on your account.'],
            ]);
        }

        $rateKey = 'otp-send:email-change:'.$user->id.'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($rateKey, 5)) {
            throw ValidationException::withMessages([
                'email' => ['Too many OTP requests. Try again in a few minutes.'],
            ]);
        }
        RateLimiter::hit($rateKey, 120);

        $otp = (string) random_int(100000, 999999);
        $cacheKey = OtpController::cacheKeyEmailChangeUser($user->id, $nextEmail);
        Cache::put($cacheKey, [
            'code' => $otp,
            'expires_at' => now()->addMinutes(self::EMAIL_OTP_TTL_MINUTES)->timestamp,
        ], now()->addMinutes(self::EMAIL_OTP_TTL_MINUTES));

        Mail::to($nextEmail)->send(new OtpMail($otp, 'Email change'));

        return response()->json([
            'message' => 'OTP sent to your new email.',
        ]);
    }

    public function sendPasswordChangeOtp(Request $request): JsonResponse
    {
        $user = $request->user();

        $rateKey = 'otp-send:password-change:'.$user->id.'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($rateKey, 5)) {
            throw ValidationException::withMessages([
                'password_otp' => ['Too many OTP requests. Try again in a few minutes.'],
            ]);
        }
        RateLimiter::hit($rateKey, 120);

        $otp = (string) random_int(100000, 999999);
        $cacheKey = OtpController::cacheKeyPasswordChangeUser((int) $user->id);
        Cache::put($cacheKey, [
            'code' => $otp,
            'expires_at' => now()->addMinutes(self::PASSWORD_OTP_TTL_MINUTES)->timestamp,
        ], now()->addMinutes(self::PASSWORD_OTP_TTL_MINUTES));

        Mail::to((string) $user->email)->send(new OtpMail($otp, 'Password change'));

        return response()->json([
            'message' => 'OTP sent to your registered email.',
        ]);
    }

    public function update(UpdateMemberProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();
        $nextEmail = strtolower(trim((string) $validated['email']));

        if (! empty($validated['password'])) {
            $current = $validated['current_password'] ?? '';
            if ($current === '' || ! Hash::check($current, $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => [__('The provided password does not match your current password.')],
                ]);
            }

            $passwordOtp = (string) ($validated['password_otp'] ?? '');
            if ($passwordOtp === '' || ! OtpController::verifyPasswordChangeUser((int) $user->id, $passwordOtp)) {
                throw ValidationException::withMessages([
                    'password_otp' => ['Invalid or expired OTP. Please request a new OTP.'],
                ]);
            }

            $user->password = $validated['password'];
        }

        if (strcasecmp((string) $user->email, $nextEmail) !== 0) {
            $otp = (string) ($validated['email_otp'] ?? '');
            if ($otp === '') {
                throw ValidationException::withMessages([
                    'email_otp' => ['Enter the OTP sent to your new email.'],
                ]);
            }
            if (! OtpController::verifyEmailChangeUser($user->id, $nextEmail, $otp)) {
                throw ValidationException::withMessages([
                    'email_otp' => ['Invalid or expired OTP. Please request a new OTP.'],
                ]);
            }
        }

        $user->fill([
            'name' => $validated['name'],
            'email' => $nextEmail,
            'phone' => $validated['phone'] ?? null,
            'profile' => $validated['profile'] ?? null,
            'survey_profile' => $validated['survey_profile'] ?? $user->survey_profile,
        ]);
        $user->save();

        return response()->json([
            'user' => $user->fresh()->load('sponsor')->toApiArray(),
        ]);
    }
}

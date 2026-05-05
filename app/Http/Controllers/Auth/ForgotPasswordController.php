<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

class ForgotPasswordController extends Controller
{
    public function reset(Request $request): JsonResponse
    {
        if ($request->filled('login_uid')) {
            $request->merge([
                'login_uid' => strtolower(trim((string) $request->input('login_uid'))),
            ]);
        }

        $otpBypass = config('otp.bypass');
        $otpRules = $otpBypass
            ? ['nullable', 'string']
            : ['required', 'string', 'size:6', 'regex:/^[0-9]+$/'];

        $validated = $request->validate([
            'login_uid' => ['required', 'string', 'exists:users,login_uid'],
            'otp' => $otpRules,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::query()->where('login_uid', $validated['login_uid'])->firstOrFail();

        if (! $otpBypass && ! OtpController::verifyPasswordResetUser((int) $user->id, (string) $validated['otp'])) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid or expired OTP. Request a new code.'],
            ]);
        }

        $user->password = $validated['password'];
        $user->save();

        return response()->json([
            'message' => 'Your password has been updated. You can sign in with your new password.',
        ]);
    }
}

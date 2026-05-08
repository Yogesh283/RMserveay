<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Support\DashboardRoute;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthenticatedSessionController extends Controller
{
    public function store(LoginRequest $request): JsonResponse
    {
        $request->authenticate();

        if ($request->hasSession()) {
            $request->session()->regenerate();
            $request->session()->put('app_login_user_type', $request->string('user_type')->toString());
        }

        $role = $request->string('user_type')->toString();

        return response()->json([
            'user' => $request->user()->toApiArray(),
            'redirect_to' => DashboardRoute::forAppRole($role),
        ]);
    }

    public function storeOtp(Request $request): JsonResponse
    {
        if ($request->filled('login_uid')) {
            $request->merge([
                'login_uid' => strtolower(trim((string) $request->input('login_uid'))),
            ]);
        }

        $validated = $request->validate([
            'login_uid' => ['required', 'string', 'exists:users,login_uid'],
            'otp' => ['required', 'string', 'size:6', 'regex:/^[0-9]+$/'],
            'user_type' => ['required', 'string', 'in:normal,publisher'],
        ]);

        $user = User::query()->where('login_uid', $validated['login_uid'])->firstOrFail();

        if (! OtpController::verifyLoginUser((int) $user->id, $validated['otp'])) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid or expired OTP. Request a new code.'],
            ]);
        }

        /**
         * Allow the same login credentials for both app roles (normal/publisher).
         * Client selection is used for redirect only.
         */

        Auth::login($user);

        $role = $validated['user_type'];

        if ($request->hasSession()) {
            $request->session()->regenerate();
            $request->session()->put('app_login_user_type', $role);
        }

        return response()->json([
            'user' => $request->user()->toApiArray(),
            'redirect_to' => DashboardRoute::forAppRole($role),
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->forget('app_login_user_type');
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Logged out']);
    }
}

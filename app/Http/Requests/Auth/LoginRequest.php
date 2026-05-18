<?php

namespace App\Http\Requests\Auth;

use App\Http\Controllers\Auth\OtpController;
use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('login_uid')) {
            $this->merge([
                'login_uid' => strtolower(trim((string) $this->input('login_uid'))),
            ]);
        }
    }

    /**
     * @return array<string, array<int, \Illuminate\Contracts\Validation\ValidationRule|string>>
     */
    public function rules(): array
    {
        $otpRules = config('otp.bypass')
            ? ['nullable', 'string']
            : ['required', 'string', 'size:6', 'regex:/^[0-9]+$/'];

        return [
            'login_uid' => ['required', 'string', 'exists:users,login_uid'],
            'password' => ['required', 'string'],
            'otp' => $otpRules,
            'user_type' => ['required', 'string', 'in:normal,publisher'],
            'remember' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials (same flow as Laravel Breeze).
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $loginUid = $this->string('login_uid')->toString();
        $password = $this->string('password')->toString();
        $otp = $this->string('otp')->toString();

        $user = User::query()->where('login_uid', $loginUid)->first();
        if (! $user || ! Hash::check($password, $user->password)) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'login_uid' => [__('auth.failed')],
            ]);
        }

        /**
         * Allow the same login credentials for both app roles (normal/publisher).
         * - Client can select account type; backend will redirect accordingly.
         * - Authorization for specific resources is still enforced by ownership checks
         *   (e.g. publisher surveys belong to the authenticated user_id).
         */

        if (! config('otp.bypass') && ! OtpController::verifyLoginUser((int) $user->id, $otp)) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'otp' => ['Invalid or expired OTP. Request a new code.'],
            ]);
        }

        if ($user->isAccountBlocked()) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'login_uid' => ['This account has been blocked. Please contact support.'],
            ]);
        }

        /** Sessions expire after 24 hours — do not extend via "remember me". */
        Auth::login($user, false);

        RateLimiter::clear($this->throttleKey());
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'login_uid' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate((string) $this->string('login_uid').'|'.$this->ip());
    }
}

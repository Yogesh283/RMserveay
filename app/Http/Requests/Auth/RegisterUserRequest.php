<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;

class RegisterUserRequest extends FormRequest
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

        $ref = $this->input('sponsor_referral_code');
        if ($ref === null || trim((string) $ref) === '') {
            $this->merge([
                'sponsor_referral_code' => null,
                'binary_side' => null,
            ]);
        } else {
            $this->merge([
                'sponsor_referral_code' => strtoupper(trim((string) $ref)),
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

        $nonceRules = config('otp.bypass')
            ? ['nullable', 'string', 'uuid']
            : ['required', 'string', 'uuid'];

        return [
            'user_type' => ['required', 'string', 'in:normal,publisher'],
            'login_uid' => [
                'required',
                'string',
                'min:3',
                'max:24',
                'regex:/^[a-z0-9_-]+$/',
                Rule::unique('users', 'login_uid'),
            ],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'phone' => ['nullable', 'string', 'max:32'],
            'otp' => $otpRules,
            'register_nonce' => $nonceRules,
            'sponsor_referral_code' => ['nullable', 'string', 'max:32', 'exists:users,referral_code'],
            'binary_side' => ['nullable', 'string', 'in:left,right'],
        ];
    }

}

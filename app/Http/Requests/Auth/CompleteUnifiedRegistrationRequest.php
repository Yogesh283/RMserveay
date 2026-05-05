<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules;

class CompleteUnifiedRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $code = $this->input('sponsor_referral_code');
        if ($code !== null && $code !== '') {
            $this->merge([
                'sponsor_referral_code' => strtoupper(trim((string) $code)),
            ]);
        } else {
            $this->merge(['sponsor_referral_code' => null]);
        }
    }

    /**
     * @return array<string, array<int, \Illuminate\Contracts\Validation\ValidationRule|string>>
     */
    public function rules(): array
    {
        return [
            'registration_token' => ['required', 'string', 'uuid'],
            'user_type' => ['required', 'string', 'in:normal,publisher'],
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'profile' => ['nullable', 'string', 'max:5000'],
            'qualification' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'sponsor_referral_code' => ['nullable', 'string', 'max:32', 'exists:users,referral_code'],
            'binary_side' => ['nullable', 'string', 'in:left,right'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if ($this->filled('sponsor_referral_code') && ! $this->filled('binary_side')) {
                $validator->errors()->add(
                    'binary_side',
                    'Choose left or right placement when registering with a referral link.'
                );
            }
        });
    }
}

<?php

namespace App\Http\Requests\Member;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateMemberProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, ValidationRule|string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->user()?->id)],
            'phone' => ['nullable', 'string', 'max:32'],
            'profile' => ['nullable', 'string', 'max:5000'],
            'survey_profile' => ['nullable', 'array'],
            'survey_profile.full_name' => ['nullable', 'string', 'max:255'],
            'survey_profile.gender' => ['nullable', 'string', Rule::in(['male', 'female', 'other'])],
            'survey_profile.age' => ['nullable', 'integer', 'min:10', 'max:99'],
            'survey_profile.country' => ['nullable', 'string', 'max:120'],
            'survey_profile.state' => ['nullable', 'string', 'max:120'],
            'survey_profile.city' => ['nullable', 'string', 'max:120'],
            'survey_profile.mobile_number' => ['nullable', 'string', 'max:32'],
            'survey_profile.email_id' => ['nullable', 'string', 'lowercase', 'email', 'max:255'],
            'survey_profile.education_level' => ['nullable', 'string', Rule::in(['10th', '12th', 'graduate', 'post_graduate'])],
            'survey_profile.occupation' => ['nullable', 'string', Rule::in(['student', 'job', 'business', 'freelancer', 'unemployed'])],
            'survey_profile.monthly_income_range' => ['nullable', 'string', Rule::in(['10k_25k', '25k_50k', '50k_plus'])],
            'survey_profile.device_type' => ['nullable', 'string', Rule::in(['android', 'iphone'])],
            'survey_profile.internet_usage' => ['nullable', 'string', Rule::in(['low', 'medium', 'high'])],
            'survey_profile.interests' => ['nullable', 'array'],
            'survey_profile.interests.*' => ['string', Rule::in(['technology', 'gaming', 'shopping', 'finance', 'crypto', 'sports', 'movies', 'travel'])],
            'survey_profile.instagram_user' => ['nullable', 'boolean'],
            'survey_profile.youtube_user' => ['nullable', 'boolean'],
            'survey_profile.telegram_user' => ['nullable', 'boolean'],
            'survey_profile.preferred_survey_language' => ['nullable', 'string', 'max:60'],
            'survey_profile.preferred_survey_category' => ['nullable', 'string', 'max:120'],
            'survey_profile.marital_status' => ['nullable', 'string', Rule::in(['married', 'unmarried'])],
            'survey_profile.vehicle_owner' => ['nullable', 'string', Rule::in(['none', 'bike', 'car', 'both'])],
            'survey_profile.online_shopping_user' => ['nullable', 'boolean'],
            'email_otp' => ['nullable', 'string', 'digits:6'],
            'current_password' => ['nullable', 'string'],
            'password' => ['nullable', 'confirmed', Password::defaults()],
        ];
    }

    protected function prepareForValidation(): void
    {
        $email = $this->input('email');
        if (is_string($email)) {
            $this->merge(['email' => strtolower(trim($email))]);
        }
    }
}

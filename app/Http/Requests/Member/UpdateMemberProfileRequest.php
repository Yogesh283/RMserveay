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
        $nextEmail = strtolower(trim((string) $this->input('email', '')));
        $currentEmail = strtolower((string) ($this->user()?->email ?? ''));
        $emailChanged = $nextEmail !== '' && $nextEmail !== $currentEmail;

        $emailRules = ['required', 'string', 'lowercase', 'email', 'max:255'];
        if ($emailChanged) {
            $emailRules[] = Rule::unique('users', 'email')->ignore($this->user()?->id);
        }

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => $emailRules,
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
            'email_otp' => [Rule::requiredIf($emailChanged), 'nullable', 'string', 'digits:6'],
            'password_otp' => ['nullable', 'string', 'digits:6', 'required_with:password'],
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

        $surveyProfile = $this->input('survey_profile');
        if (is_array($surveyProfile)) {
            if (isset($surveyProfile['email_id']) && is_string($surveyProfile['email_id'])) {
                $surveyProfile['email_id'] = strtolower(trim($surveyProfile['email_id']));
            }
            foreach (['full_name', 'country', 'state', 'city', 'mobile_number', 'preferred_survey_language', 'preferred_survey_category'] as $stringKey) {
                if (isset($surveyProfile[$stringKey]) && is_string($surveyProfile[$stringKey])) {
                    $surveyProfile[$stringKey] = trim($surveyProfile[$stringKey]);
                }
            }
            foreach (['full_name', 'country', 'state', 'city', 'mobile_number', 'email_id', 'gender', 'education_level', 'occupation', 'monthly_income_range', 'device_type', 'internet_usage', 'marital_status', 'vehicle_owner', 'preferred_survey_language', 'preferred_survey_category'] as $emptyToNullKey) {
                if (array_key_exists($emptyToNullKey, $surveyProfile) && $surveyProfile[$emptyToNullKey] === '') {
                    $surveyProfile[$emptyToNullKey] = null;
                }
            }
            $this->merge(['survey_profile' => $surveyProfile]);
        }
    }
}

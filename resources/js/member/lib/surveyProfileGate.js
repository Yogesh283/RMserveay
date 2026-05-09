/**
 * Minimum fields a member must fill in the "Short User Profile Form" before
 * they're allowed to open or complete any survey. Kept intentionally short so
 * the gate is light — admins can still demand richer targeting per-survey via
 * the survey questions themselves.
 *
 * Field keys mirror those captured by `MemberSurveyProfileFormPage` and stored
 * inside `users.survey_profile` (JSON cast).
 */
export const REQUIRED_SURVEY_PROFILE_FIELDS = [
    'full_name',
    'gender',
    'age',
    'country',
    'state',
    'city',
    'mobile_number',
    'email_id',
    'education_level',
    'occupation',
    'device_type',
];

function hasValue(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'number') return Number.isFinite(v) && v > 0;
    return Boolean(v);
}

/**
 * Returns true when the user has filled every required short-profile field.
 * Pass either the raw `survey_profile` JSON object or the whole `user` object;
 * both are accepted.
 */
export function isSurveyProfileComplete(input) {
    if (!input) return false;
    const profile = input.survey_profile && typeof input.survey_profile === 'object' ? input.survey_profile : input;
    if (!profile || typeof profile !== 'object') return false;
    for (const key of REQUIRED_SURVEY_PROFILE_FIELDS) {
        if (!hasValue(profile[key])) return false;
    }
    return true;
}

/** Where to send the member to fill the gate. Preserves a `from` so we can return after save. */
export function profileGateRedirectPath(fromPath = '/member/surveys') {
    const safeFrom = fromPath && typeof fromPath === 'string' ? fromPath : '/member/surveys';
    const qs = new URLSearchParams({ from: safeFrom });
    return `/member/profile-form?${qs.toString()}`;
}

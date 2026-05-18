import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PhoneInput, { isPossiblePhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import MemberApkDownloadButton from './MemberApkDownloadButton';
import PasswordField from './PasswordField';
import { describeAxiosNetworkError } from '../lib/axiosErrorMessage';
import { prepareSanctum } from '../lib/auth';
import { redirectAfterAuth } from '../lib/authRedirect';

const labelCls = 'block text-xs font-medium uppercase tracking-wide text-white sm:text-sm';
const inputCls =
    'mt-1.5 w-full rounded-xl border border-white/[0.1] bg-white/[0.06] px-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:border-[#7C3AED]/50 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/35 sm:mt-2 sm:px-4 sm:py-3 sm:text-sm';

async function copyToClipboard(text) {
    if (!text) {
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        /* ignore */
    }
}

export function RegistrationCredentialsModal({ loginUid, password, onContinue }) {
    const { t } = useTranslation();

    useEffect(() => {
        const t = window.setTimeout(() => onContinue(), 5000);
        return () => window.clearTimeout(t);
    }, [onContinue]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
                onClick={onContinue}
                aria-label="Close"
            />
            <div
                className="relative z-10 w-full max-w-md rounded-2xl border border-[#8E6BFF]/35 bg-[#0f172a] p-6 shadow-[0_0_48px_rgba(124,58,237,0.25)] sm:p-8"
                role="dialog"
                aria-labelledby="reg-success-title"
                aria-modal="true"
            >
                <p id="reg-success-title" className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C4B5FD]">
                    {t('register.form.accountCreated')}
                </p>
                <h3 className="mt-2 text-center text-xl font-bold text-white">{t('register.form.saveLoginDetails')}</h3>
                <p className="mt-2 text-center text-xs leading-relaxed text-slate-400">
                    {t('register.form.credentialsHelpPrefix')} <strong className="text-slate-300">{t('register.form.userId')}</strong> {t('register.form.and')}{' '}
                    <strong className="text-slate-300">{t('register.form.password')}</strong> {t('register.form.credentialsHelpSuffix')}{' '}
                    <span className="text-amber-200/90">{t('register.form.fiveSeconds')}</span>.
                </p>
                <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-black/25 p-4">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('register.form.userId')}</p>
                        <div className="mt-1 flex items-center gap-2">
                            <p className="min-w-0 flex-1 break-all font-mono text-lg font-bold text-[#93C5FD]">{loginUid}</p>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(loginUid)}
                                className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-white/15"
                            >
                                {t('register.form.copy')}
                            </button>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('register.form.password')}</p>
                        <div className="mt-1 flex items-center gap-2">
                            <p className="min-w-0 flex-1 break-all font-mono text-sm font-semibold text-white">{password}</p>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(password)}
                                className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-white/15"
                            >
                                {t('register.form.copy')}
                            </button>
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onContinue}
                    className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] py-3 text-sm font-semibold text-white shadow-lg shadow-purple-950/40 hover:brightness-110"
                >
                    {t('register.form.continueToApp')}
                </button>
                <MemberApkDownloadButton variant="auth" className="mt-3" />
            </div>
        </div>
    );
}

/**
 * Standalone register form. Used by the dedicated panelist/publisher pages.
 * `accent` controls the submit-button gradient + ring colors so each page can stay on-theme.
 */
export default function RegisterCard({
    userType = 'normal',
    otpBypass = false,
    urlRef = '',
    urlSide = '',
    accent = 'panelist',
    surfaceClassName,
}) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const registerNonceRef = useRef(crypto.randomUUID());
    const pendingAuthRef = useRef(null);
    const [loginUid, setLoginUid] = useState('');
    const [uidStatus, setUidStatus] = useState('idle');
    const [suggestions, setSuggestions] = useState([]);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [sponsorReferralCode, setSponsorReferralCode] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [otpSending, setOtpSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [credentialsModal, setCredentialsModal] = useState(null);

    const finishRegistrationAndRedirect = useCallback(async () => {
        const pending = pendingAuthRef.current;
        pendingAuthRef.current = null;
        setCredentialsModal(null);
        if (pending) {
            await redirectAfterAuth(navigate, pending);
        }
    }, [navigate]);

    const hasInviteLink = Boolean(urlRef?.trim());
    const placementLockedFromLink = urlSide === 'left' || urlSide === 'right';

    useEffect(() => {
        if (userType !== 'normal') {
            return;
        }
        if (urlRef?.trim()) {
            setSponsorReferralCode(urlRef.trim().toUpperCase());
        }
    }, [urlRef, userType]);

    const placementLabel =
        placementLockedFromLink ? (urlSide === 'left' ? t('register.leftLeg') : t('register.rightLeg')) : null;

    useEffect(() => {
        const raw = loginUid.trim();
        if (raw.length === 0) {
            setUidStatus('idle');
            setSuggestions([]);
            return undefined;
        }
        if (raw.length < 3) {
            setUidStatus('short');
            setSuggestions([]);
            return undefined;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(raw)) {
            setUidStatus('invalid');
            setSuggestions([]);
            return undefined;
        }

        let cancelled = false;
        const t = window.setTimeout(async () => {
            setUidStatus('checking');
            try {
                await prepareSanctum();
                const { data } = await window.axios.get('api/register/login-uid/check', {
                    params: { q: raw },
                });
                if (cancelled) {
                    return;
                }
                if (data.available === true) {
                    setUidStatus('available');
                    setSuggestions([]);
                } else if (data.available === false) {
                    setUidStatus('taken');
                    setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
                } else {
                    setUidStatus('short');
                    setSuggestions([]);
                }
            } catch {
                if (!cancelled) {
                    setUidStatus('error');
                    setSuggestions([]);
                }
            }
        }, 380);
        return () => {
            cancelled = true;
            window.clearTimeout(t);
        };
    }, [loginUid]);

    async function sendOtp() {
        setError(null);
        setFieldErrors({});
        if (!email?.trim()) {
            setError(t('register.form.errors.enterEmailFirst'));
            return;
        }
        if (!window.axios?.post) {
            setError(t('register.form.errors.pageNotLoaded'));
            return;
        }
        setOtpSending(true);
        try {
            await prepareSanctum();
            await window.axios.post('api/otp/send', {
                email: email.trim(),
                purpose: 'register',
                register_nonce: registerNonceRef.current,
            });
            setError(null);
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors?.email?.[0]) {
                setError(data.errors.email[0]);
            } else {
                setError(data?.message ?? err.message ?? t('register.form.errors.couldNotSendOtp'));
            }
        } finally {
            setOtpSending(false);
        }
    }

    async function onSubmit(e) {
        e.preventDefault();
        setError(null);
        setFieldErrors({});
        if (!window.axios?.post) {
            setError(t('register.form.errors.pageNotLoaded'));
            return;
        }
        if (uidStatus !== 'available') {
            setError(t('register.form.errors.chooseAvailableUid'));
            return;
        }
        if (phone?.trim() && !isPossiblePhoneNumber(phone)) {
            setError(t('register.form.errors.validMobile'));
            return;
        }
        const sponsorTrim = sponsorReferralCode?.trim() ?? '';
        if (!otpBypass && otp.length !== 6) {
            setError(t('register.form.errors.enterOtp'));
            return;
        }
        const plainPassword = password;
        setLoading(true);
        try {
            await prepareSanctum();
            const payload = {
                user_type: userType,
                login_uid: loginUid.trim().toLowerCase(),
                name: name.trim(),
                email: email.trim(),
                password,
                password_confirmation: passwordConfirmation,
                phone: phone || null,
                otp: otpBypass ? '' : otp,
            };
            if (!otpBypass) {
                payload.register_nonce = registerNonceRef.current;
            }
            if (userType === 'normal' && sponsorTrim) {
                payload.sponsor_referral_code = sponsorTrim.toUpperCase();
                if (placementLockedFromLink) {
                    payload.binary_side = urlSide;
                }
            }
            const { data } = await window.axios.post('api/register', payload);
            pendingAuthRef.current = {
                from: location.state?.from,
                user: data.user,
                redirectTo: data.redirect_to,
            };
            setCredentialsModal({
                loginUid: data.user?.login_uid ?? loginUid.trim().toLowerCase(),
                password: plainPassword,
            });
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors) {
                setFieldErrors(data.errors);
            }
            if (!err.response) {
                setError(describeAxiosNetworkError(err));
            } else {
                setError(data?.message ?? err.message ?? t('register.form.errors.registrationFailed'));
            }
        } finally {
            setLoading(false);
        }
    }

    const submitGradient =
        accent === 'publisher'
            ? 'bg-gradient-to-r from-[#F59E0B] via-[#F97316] to-[#EF4444] ring-1 ring-[#FBBF24]/35 shadow-[0_0_28px_rgba(245,158,11,0.4)]'
            : 'bg-gradient-to-r from-[#7C3AED] via-[#5B6BFF] to-[#22D3EE] ring-1 ring-[#A78BFA]/35 shadow-[0_0_28px_rgba(124,58,237,0.4)]';

    const otpButtonClass =
        accent === 'publisher'
            ? 'shrink-0 rounded-xl border border-[#F59E0B]/40 bg-[rgba(245,158,11,0.15)] px-3 py-2 text-[10px] font-semibold text-amber-100 transition hover:bg-[rgba(245,158,11,0.28)] disabled:opacity-50 sm:rounded-[14px] sm:px-4 sm:py-3 sm:text-xs'
            : 'shrink-0 rounded-xl border border-[#7C3AED]/40 bg-[rgba(124,58,237,0.15)] px-3 py-2 text-[10px] font-semibold text-[#C4B5FD] transition hover:bg-[rgba(124,58,237,0.25)] disabled:opacity-50 sm:rounded-[14px] sm:px-4 sm:py-3 sm:text-xs';

    return (
        <div className={surfaceClassName ?? 'rounded-[20px] border border-white/[0.08] bg-[rgba(15,23,42,0.6)] p-4 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.45)] sm:p-6 md:p-7'}>
            {otpBypass ? (
                <p className="mb-3 rounded-lg border border-amber-500/25 bg-amber-950/30 px-2.5 py-1.5 text-[11px] text-amber-100 sm:text-xs">
                    {t('register.form.otpBypass')}
                </p>
            ) : null}
            <form className="space-y-3 sm:space-y-4" onSubmit={onSubmit} noValidate>
                {error && (
                    <p className="rounded-lg border border-red-500/35 bg-red-950/35 px-2.5 py-1.5 text-xs text-red-200 sm:rounded-[12px] sm:px-3 sm:py-2 sm:text-sm">
                        {error}
                    </p>
                )}
                <div>
                    <label className={labelCls} htmlFor={`login-uid-${userType}`}>
                        {t('register.form.userId')}
                    </label>
                    <input
                        id={`login-uid-${userType}`}
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={loginUid}
                        onChange={(ev) => setLoginUid(ev.target.value.replace(/\s/g, '').slice(0, 24))}
                        className={inputCls}
                        placeholder="e.g. raj_survey_92"
                    />
                    {uidStatus === 'checking' ? (
                        <p className="mt-1 text-xs text-slate-500">{t('register.form.uidChecking')}</p>
                    ) : null}
                    {uidStatus === 'available' ? (
                        <p className="mt-1 text-xs text-emerald-400">{t('register.form.uidAvailable')}</p>
                    ) : null}
                    {uidStatus === 'taken' ? (
                        <p className="mt-1 text-xs text-amber-200">{t('register.form.uidTaken')}</p>
                    ) : null}
                    {uidStatus === 'short' && loginUid.trim().length > 0 ? (
                        <p className="mt-1 text-xs text-slate-500">{t('register.form.uidShort')}</p>
                    ) : null}
                    {uidStatus === 'invalid' ? (
                        <p className="mt-1 text-xs text-red-400">{t('register.form.uidInvalid')}</p>
                    ) : null}
                    {uidStatus === 'error' ? (
                        <p className="mt-1 text-xs text-red-400">{t('register.form.uidError')}</p>
                    ) : null}
                    {suggestions.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {suggestions.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setLoginUid(s)}
                                    className="rounded-lg border border-[#7C3AED]/35 bg-[rgba(124,58,237,0.12)] px-2.5 py-1 font-mono text-[11px] text-[#C4B5FD] hover:bg-[rgba(124,58,237,0.22)]"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    ) : null}
                    {fieldErrors.login_uid?.[0] ? <p className="mt-1 text-xs text-red-400">{fieldErrors.login_uid[0]}</p> : null}
                </div>
                <div>
                    <label className={labelCls} htmlFor={`email-${userType}`}>
                        {t('register.form.email')}
                    </label>
                    {otpBypass ? (
                        <input
                            id={`email-${userType}`}
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(ev) => setEmail(ev.target.value)}
                            className={inputCls}
                            placeholder="you@example.com"
                        />
                    ) : (
                        <div className="mt-1.5 flex flex-col gap-1.5 sm:mt-2 sm:flex-row sm:items-stretch sm:gap-2">
                            <input
                                id={`email-${userType}`}
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(ev) => setEmail(ev.target.value)}
                                className={`${inputCls} flex-1`}
                                placeholder="you@example.com"
                            />
                            <button type="button" onClick={sendOtp} disabled={otpSending} className={otpButtonClass}>
                                {otpSending ? t('register.form.sending') : t('register.form.sendOtp')}
                            </button>
                        </div>
                    )}
                    {fieldErrors.email?.[0] && <p className="mt-1 text-xs text-red-400">{fieldErrors.email[0]}</p>}
                </div>
                {!otpBypass && (
                    <div>
                        <label className={labelCls} htmlFor={`otp-${userType}`}>
                            {t('register.form.emailOtp')}
                        </label>
                        <input
                            id={`otp-${userType}`}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={otp}
                            onChange={(ev) => setOtp(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                            className={inputCls}
                            placeholder={t('register.form.codePlaceholder')}
                        />
                        {fieldErrors.otp?.[0] && <p className="mt-1 text-xs text-red-400">{fieldErrors.otp[0]}</p>}
                    </div>
                )}
                <div>
                    <label className={labelCls} htmlFor={`name-${userType}`}>
                        {t('register.form.fullName')}
                    </label>
                    <input
                        id={`name-${userType}`}
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(ev) => setName(ev.target.value)}
                        className={inputCls}
                    />
                    {fieldErrors.name?.[0] && <p className="mt-1 text-xs text-red-400">{fieldErrors.name[0]}</p>}
                </div>
                <div className="[&_.PhoneInput]:mt-2 [&_.PhoneInput]:w-full [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:rounded-[14px] [&_.PhoneInputInput]:border [&_.PhoneInputInput]:border-white/[0.1] [&_.PhoneInputInput]:bg-white/[0.06] [&_.PhoneInputInput]:px-4 [&_.PhoneInputInput]:py-3 [&_.PhoneInputInput]:text-sm [&_.PhoneInputInput]:text-white [&_.PhoneInputInput]:placeholder:text-slate-600 [&_.PhoneInputCountry]:mr-2 [&_.PhoneInputCountryIcon]:opacity-90">
                    <label className={labelCls}>{t('register.form.mobile')}</label>
                    <PhoneInput international defaultCountry="US" value={phone} onChange={setPhone} />
                    {fieldErrors.phone?.[0] && <p className="mt-1 text-xs text-red-400">{fieldErrors.phone[0]}</p>}
                </div>
                {userType === 'normal' &&
                    (hasInviteLink ? (
                        <div>
                            <label className={labelCls} htmlFor={`ref-${userType}`}>
                                {t('register.form.sponsorReferralCode')} <span className="font-normal normal-case text-white/85">({t('register.form.fromInvite')})</span>
                            </label>
                            <input
                                id={`ref-${userType}`}
                                type="text"
                                readOnly
                                value={sponsorReferralCode}
                                className={`${inputCls} cursor-default font-mono uppercase opacity-95`}
                                autoComplete="off"
                                aria-readonly="true"
                            />
                            {fieldErrors.sponsor_referral_code?.[0] ? (
                                <p className="mt-1 text-xs text-red-400">{fieldErrors.sponsor_referral_code[0]}</p>
                            ) : null}
                            {placementLockedFromLink ? (
                                <div className="mt-3">
                                    <p className={labelCls}>{t('register.form.teamPlacement')}</p>
                                    {fieldErrors.binary_side?.[0] ? (
                                        <p className="mt-1 text-xs text-red-400">{fieldErrors.binary_side[0]}</p>
                                    ) : null}
                                    {placementLabel && sponsorReferralCode.trim() ? (
                                        <>
                                            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                                                {t('register.form.placement')}: <span className="font-semibold text-[#FDE68A]">{placementLabel}</span> {t('register.form.under')}{' '}
                                                <span className="font-mono text-[#FDE68A]">{sponsorReferralCode.trim()}</span>
                                            </p>
                                            <p className="mt-1 text-[10px] text-slate-600">
                                                {t('register.form.placementHint')}
                                            </p>
                                        </>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div>
                            <label className={labelCls} htmlFor={`ref-manual-${userType}`}>
                                {t('register.form.referralCode')} <span className="font-normal normal-case text-white/85">({t('register.form.optional')})</span>
                            </label>
                            <input
                                id={`ref-manual-${userType}`}
                                type="text"
                                value={sponsorReferralCode}
                                onChange={(ev) => setSponsorReferralCode(ev.target.value.toUpperCase().replace(/\s/g, ''))}
                                className={`${inputCls} font-mono uppercase`}
                                placeholder={t('register.form.sponsorPlaceholder')}
                                autoComplete="off"
                                maxLength={32}
                            />
                            {fieldErrors.sponsor_referral_code?.[0] ? (
                                <p className="mt-1 text-xs text-red-400">{fieldErrors.sponsor_referral_code[0]}</p>
                            ) : (
                                <p className="mt-1.5 text-[11px] text-slate-500">{t('register.form.sponsorHint')}</p>
                            )}
                        </div>
                    ))}
                <PasswordField
                    id={`pw-${userType}`}
                    label={t('register.form.password')}
                    labelClassName={labelCls}
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    required
                    inputClassName={inputCls}
                    autoComplete="new-password"
                    error={fieldErrors.password ? (Array.isArray(fieldErrors.password) ? fieldErrors.password[0] : fieldErrors.password) : undefined}
                />
                <PasswordField
                    id={`pw2-${userType}`}
                    label={t('register.form.confirmPassword')}
                    labelClassName={labelCls}
                    value={passwordConfirmation}
                    onChange={(ev) => setPasswordConfirmation(ev.target.value)}
                    required
                    inputClassName={inputCls}
                    autoComplete="new-password"
                    error={fieldErrors.password_confirmation?.[0]}
                />
                <button
                    type="submit"
                    disabled={loading || uidStatus !== 'available'}
                    className={`w-full rounded-[14px] py-2.5 text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60 sm:rounded-[16px] sm:py-3.5 sm:text-sm ${submitGradient}`}
                >
                    {loading ? t('register.form.creatingAccount') : t('register.form.createAccount')}
                </button>
                <MemberApkDownloadButton variant="auth" />
            </form>
            {credentialsModal ? (
                <RegistrationCredentialsModal
                    loginUid={credentialsModal.loginUid}
                    password={credentialsModal.password}
                    onContinue={finishRegistrationAndRedirect}
                />
            ) : null}
        </div>
    );
}

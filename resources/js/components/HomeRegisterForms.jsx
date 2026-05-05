import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AppLogo from './AppLogo';
import PasswordField from './PasswordField';
import PhoneInput, { isPossiblePhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { describeAxiosNetworkError } from '../lib/axiosErrorMessage';
import { prepareSanctum } from '../lib/auth';
import { redirectAfterAuth } from '../lib/authRedirect';
import { readReferralParams } from '../lib/registerReferral';

const surface =
    'rounded-[16px] border border-white/[0.08] bg-[rgba(15,23,42,0.5)] p-4 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:rounded-[20px] sm:p-6 md:p-7';
const labelCls =
    'block text-xs font-medium uppercase tracking-wide text-white sm:text-sm';
const inputCls =
    'mt-1.5 w-full rounded-xl border border-white/[0.1] bg-white/[0.06] px-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:border-[#7C3AED]/50 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/35 sm:mt-2 sm:px-4 sm:py-3 sm:text-sm';

const btnPickNormal =
    'inline-flex min-h-[38px] min-w-0 flex-1 items-center justify-center rounded-lg border border-[#3B82F6]/45 bg-[rgba(59,130,246,0.18)] px-3 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-white/[0.06] transition hover:bg-[rgba(59,130,246,0.32)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50 active:brightness-95 sm:min-h-[40px] sm:min-w-[140px] sm:flex-none sm:rounded-xl sm:px-4 sm:text-sm';
const btnPickPublisher =
    'inline-flex min-h-[38px] min-w-0 flex-1 items-center justify-center rounded-lg border border-[#F59E0B]/45 bg-[rgba(245,158,11,0.14)] px-3 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-white/[0.06] transition hover:bg-[rgba(245,158,11,0.26)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]/50 active:brightness-95 sm:min-h-[40px] sm:min-w-[140px] sm:flex-none sm:rounded-xl sm:px-4 sm:text-sm';

const actionBtnLogin =
    'flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#7C3AED]/40 bg-gradient-to-r from-[#7C3AED]/30 to-[#3B82F6]/25 py-3 text-center text-sm font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.25)] ring-1 ring-amber-400/15 transition hover:brightness-110 sm:rounded-[18px] sm:py-4 sm:text-base';

const actionBtnRegister =
    'flex w-full items-center justify-center gap-2 rounded-[14px] border border-white/[0.14] bg-white/[0.06] py-3 text-center text-sm font-semibold text-white transition hover:bg-white/[0.1] sm:rounded-[18px] sm:py-4 sm:text-base';

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

function RegistrationCredentialsModal({ loginUid, password, onContinue }) {
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
                    Account created
                </p>
                <h3 className="mt-2 text-center text-xl font-bold text-white">Save your login details</h3>
                <p className="mt-2 text-center text-xs leading-relaxed text-slate-400">
                    You’ll need your <strong className="text-slate-300">User ID</strong> and <strong className="text-slate-300">password</strong> every time you sign in. This
                    window closes automatically in <span className="text-amber-200/90">5 seconds</span>.
                </p>
                <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-black/25 p-4">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">User ID</p>
                        <div className="mt-1 flex items-center gap-2">
                            <p className="min-w-0 flex-1 break-all font-mono text-lg font-bold text-[#93C5FD]">{loginUid}</p>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(loginUid)}
                                className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-white/15"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Password</p>
                        <div className="mt-1 flex items-center gap-2">
                            <p className="min-w-0 flex-1 break-all font-mono text-sm font-semibold text-white">{password}</p>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(password)}
                                className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-white/15"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onContinue}
                    className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] py-3 text-sm font-semibold text-white shadow-lg shadow-purple-950/40 hover:brightness-110"
                >
                    Continue to app
                </button>
            </div>
        </div>
    );
}

const segInactive =
    'rounded-xl py-2.5 text-center text-xs font-semibold text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200 sm:text-sm';

function RegisterCard({ title, eyebrow, userType, note, otpBypass, urlRef = '', urlSide = '', onRoleChange }) {
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

    const placementLabel = useMemo(() => {
        if (urlSide !== 'left' && urlSide !== 'right') {
            return null;
        }
        return urlSide === 'left' ? 'Left leg' : 'Right leg';
    }, [urlSide]);

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
            setError('Enter your email first.');
            return;
        }
        if (!window.axios?.post) {
            setError('Page did not load fully. Refresh and try again.');
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
                setError(data?.message ?? err.message ?? 'Could not send OTP.');
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
            setError('Page did not load fully. Refresh and try again.');
            return;
        }
        if (uidStatus !== 'available') {
            setError('Choose a unique User ID that is available (green check).');
            return;
        }
        if (phone?.trim() && !isPossiblePhoneNumber(phone)) {
            setError('Enter a valid mobile number with country code.');
            return;
        }
        const sponsorTrim = sponsorReferralCode?.trim() ?? '';
        if (!otpBypass && otp.length !== 6) {
            setError('Enter the 6-digit email OTP.');
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
                setError(data?.message ?? err.message ?? 'Registration failed.');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={surface}>
            {typeof onRoleChange === 'function' ? (
                <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-2xl border border-white/[0.1] bg-black/30 p-1 ring-1 ring-white/[0.04]">
                    <button
                        type="button"
                        onClick={() => onRoleChange('normal')}
                        className={userType === 'normal' ? `${btnPickNormal} !flex min-h-[44px] flex-1 items-center justify-center` : segInactive}
                    >
                        Panelist user
                    </button>
                    <button
                        type="button"
                        onClick={() => onRoleChange('publisher')}
                        className={userType === 'publisher' ? `${btnPickPublisher} !flex min-h-[44px] flex-1 items-center justify-center` : segInactive}
                    >
                        Publisher
                    </button>
                </div>
            ) : null}
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93C5FD] sm:text-[11px]">{eyebrow}</p>
            <h3 className="mt-0.5 text-lg font-bold leading-tight text-white sm:mt-1 sm:text-xl">{title}</h3>
            {note ? (
                <p className="mt-1.5 text-xs leading-snug text-slate-400 sm:mt-2 sm:text-sm sm:leading-relaxed">{note}</p>
            ) : null}
            {otpBypass ? (
                <p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-950/30 px-2.5 py-1.5 text-[11px] text-amber-100 sm:text-xs">
                    OTP bypass is on (dev only) — email code not required.
                </p>
            ) : null}
            <form className="mt-4 space-y-3 sm:mt-6 sm:space-y-4" onSubmit={onSubmit} noValidate>
                {error && (
                    <p className="rounded-lg border border-red-500/35 bg-red-950/35 px-2.5 py-1.5 text-xs text-red-200 sm:rounded-[12px] sm:px-3 sm:py-2 sm:text-sm">
                        {error}
                    </p>
                )}
                <div>
                    <label className={labelCls} htmlFor={`login-uid-${userType}`}>
                        User ID
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
                        <p className="mt-1 text-xs text-slate-500">Checking availability…</p>
                    ) : null}
                    {uidStatus === 'available' ? (
                        <p className="mt-1 text-xs text-emerald-400">This User ID is available.</p>
                    ) : null}
                    {uidStatus === 'taken' ? (
                        <p className="mt-1 text-xs text-amber-200">That User ID is already taken. Try another or pick a suggestion below.</p>
                    ) : null}
                    {uidStatus === 'short' && loginUid.trim().length > 0 ? (
                        <p className="mt-1 text-xs text-slate-500">Use at least 3 characters.</p>
                    ) : null}
                    {uidStatus === 'invalid' ? (
                        <p className="mt-1 text-xs text-red-400">Only letters, numbers, underscore and hyphen.</p>
                    ) : null}
                    {uidStatus === 'error' ? (
                        <p className="mt-1 text-xs text-red-400">Could not verify availability. Check your connection.</p>
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
                        Email
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
                            <button
                                type="button"
                                onClick={sendOtp}
                                disabled={otpSending}
                                className="shrink-0 rounded-xl border border-[#7C3AED]/40 bg-[rgba(124,58,237,0.15)] px-3 py-2 text-[10px] font-semibold text-[#C4B5FD] transition hover:bg-[rgba(124,58,237,0.25)] disabled:opacity-50 sm:rounded-[14px] sm:px-4 sm:py-3 sm:text-xs"
                            >
                                {otpSending ? 'Sending…' : 'Send OTP'}
                            </button>
                        </div>
                    )}
                    {fieldErrors.email?.[0] && <p className="mt-1 text-xs text-red-400">{fieldErrors.email[0]}</p>}
                </div>
                {!otpBypass && (
                    <div>
                        <label className={labelCls} htmlFor={`otp-${userType}`}>
                            Email OTP
                        </label>
                        <input
                            id={`otp-${userType}`}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={otp}
                            onChange={(ev) => setOtp(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                            className={inputCls}
                            placeholder="6-digit code"
                        />
                        {fieldErrors.otp?.[0] && <p className="mt-1 text-xs text-red-400">{fieldErrors.otp[0]}</p>}
                    </div>
                )}
                <div>
                    <label className={labelCls} htmlFor={`name-${userType}`}>
                        Full name
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
                    <label className={labelCls}>Mobile (with country code)</label>
                    <PhoneInput international defaultCountry="US" value={phone} onChange={setPhone} />
                    {fieldErrors.phone?.[0] && <p className="mt-1 text-xs text-red-400">{fieldErrors.phone[0]}</p>}
                </div>
                {userType === 'normal' &&
                    (hasInviteLink ? (
                        <div>
                            <label className={labelCls} htmlFor={`ref-${userType}`}>
                                Sponsor referral code <span className="font-normal normal-case text-white/85">(from invite)</span>
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
                                    <p className={labelCls}>Binary placement</p>
                                    {fieldErrors.binary_side?.[0] ? (
                                        <p className="mt-1 text-xs text-red-400">{fieldErrors.binary_side[0]}</p>
                                    ) : null}
                                    {placementLabel && sponsorReferralCode.trim() ? (
                                        <>
                                            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                                                Placement: <span className="font-semibold text-[#FDE68A]">{placementLabel}</span> under{' '}
                                                <span className="font-mono text-[#FDE68A]">{sponsorReferralCode.trim()}</span>
                                            </p>
                                            <p className="mt-1 text-[10px] text-slate-600">
                                                Set by your invite link (left or right); cannot be changed here.
                                            </p>
                                        </>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div>
                            <label className={labelCls} htmlFor={`ref-manual-${userType}`}>
                                Referral code <span className="font-normal normal-case text-white/85">(optional)</span>
                            </label>
                            <input
                                id={`ref-manual-${userType}`}
                                type="text"
                                value={sponsorReferralCode}
                                onChange={(ev) => setSponsorReferralCode(ev.target.value.toUpperCase().replace(/\s/g, ''))}
                                className={`${inputCls} font-mono uppercase`}
                                placeholder="Sponsor’s code if you have one"
                                autoComplete="off"
                                maxLength={32}
                            />
                            {fieldErrors.sponsor_referral_code?.[0] ? (
                                <p className="mt-1 text-xs text-red-400">{fieldErrors.sponsor_referral_code[0]}</p>
                            ) : (
                                <p className="mt-1.5 text-[11px] text-slate-500">Optional — connects you to your sponsor when the code is valid.</p>
                            )}
                        </div>
                    ))}
                <PasswordField
                    id={`pw-${userType}`}
                    label="Password"
                    labelClassName={labelCls}
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    required
                    inputClassName={inputCls}
                    autoComplete="new-password"
                    error={
                        fieldErrors.password
                            ? Array.isArray(fieldErrors.password)
                                ? fieldErrors.password[0]
                                : fieldErrors.password
                            : undefined
                    }
                />
                <PasswordField
                    id={`pw2-${userType}`}
                    label="Confirm password"
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
                    className="w-full rounded-[14px] bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] py-2.5 text-[13px] font-semibold text-white ring-1 ring-[#F59E0B]/20 shadow-[0_0_28px_rgba(124,58,237,0.35)] transition hover:brightness-110 disabled:opacity-60 sm:rounded-[16px] sm:py-3.5 sm:text-sm"
                >
                    {loading ? 'Creating account…' : 'Register'}
                </button>
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

function buildLoginHref(account) {
    const q = new URLSearchParams();
    q.set('user_type', account);
    return `/login?${q.toString()}`;
}

export default function HomeRegisterForms() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [otpBypass, setOtpBypass] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await prepareSanctum();
                const { data } = await window.axios.get('api/auth/config');
                if (!cancelled && data?.otp_bypass) {
                    setOtpBypass(true);
                }
            } catch {
                /* ignore */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const referralQ = useMemo(() => readReferralParams(searchParams), [searchParams]);
    const refParam = referralQ.ref;
    const urlRef = referralQ.ref;
    const urlSide = referralQ.side;

    const accountRaw = searchParams.get('account') ?? searchParams.get('register');
    const accountParam = accountRaw === 'normal' || accountRaw === 'publisher' ? accountRaw : null;
    const hashRegister =
        location.hash === '#register' ||
        location.hash === 'register' ||
        (typeof window !== 'undefined' && window.location.hash === '#register');
    /** Show register when #register, ?account=, or ?ref= / ?referral= (invite link). */
    const registerSectionOpen = hashRegister || accountParam != null || refParam.length > 0;
    /** Referral links always use normal (member) registration. */
    const account = refParam ? 'normal' : accountParam ?? (hashRegister ? 'normal' : null);
    const showRegisterForm = searchParams.get('flow') === 'register';

    /** Keep #register + query together — setSearchParams() drops the hash in many cases. */
    function navigateRegister(nextParams) {
        const str = nextParams.toString();
        navigate(
            {
                pathname: location.pathname || '/',
                search: str ? `?${str}` : '',
                hash: 'register',
            },
            { replace: true },
        );
    }

    /** Full-page open of /?account=…#register sometimes lands before RR parses search — sync from window once. */
    useLayoutEffect(() => {
        const wSearch = window.location.search;
        if (!wSearch || wSearch.length <= 1) {
            return;
        }
        const win = new URLSearchParams(wSearch.startsWith('?') ? wSearch.slice(1) : wSearch);
        const rr = new URLSearchParams(searchParams);
        if (win.get('account') && !rr.get('account')) {
            const hash = window.location.hash.replace(/^#/, '') || 'register';
            navigate(
                {
                    pathname: window.location.pathname || '/',
                    search: wSearch,
                    hash,
                },
                { replace: true },
            );
        }
    }, []);

    useLayoutEffect(() => {
        const wantsRegister =
            location.hash === '#register' ||
            location.hash === 'register' ||
            window.location.hash === '#register' ||
            refParam.length > 0;
        if (!wantsRegister) {
            return;
        }
        requestAnimationFrame(() => {
            document.getElementById('register')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, [location.hash, location.search, searchParams, refParam]);

    /** `?ref=` / `?referral=` — open normal registration form, preserve leg when `side` is set. */
    useEffect(() => {
        if (!refParam) {
            return;
        }
        if (searchParams.get('flow') === 'register') {
            return;
        }
        const next = new URLSearchParams(searchParams);
        next.set('account', 'normal');
        next.set('flow', 'register');
        navigateRegister(next);
    }, [refParam, searchParams]);

    useEffect(() => {
        const r = searchParams.get('register');
        const a = searchParams.get('account');
        if (!r || a || (r !== 'normal' && r !== 'publisher')) {
            return;
        }
        const next = new URLSearchParams(searchParams);
        next.set('account', r);
        next.set('flow', 'register');
        next.delete('register');
        navigateRegister(next);
    }, [searchParams]);

    /** `#register` without ?account= — sync URL so refresh/back keeps state. */
    useEffect(() => {
        if (!hashRegister || accountParam) {
            return;
        }
        const next = new URLSearchParams(searchParams);
        next.set('account', 'normal');
        navigateRegister(next);
    }, [hashRegister, accountParam, searchParams]);

    /** `/?account=normal#register` (or publisher) — open the OTP registration form directly, not the login/register chooser. */
    useEffect(() => {
        const accRaw = searchParams.get('account') ?? searchParams.get('register');
        if ((accRaw !== 'normal' && accRaw !== 'publisher') || searchParams.get('flow') === 'register') {
            return;
        }
        const hashRegister =
            location.hash === '#register' ||
            location.hash === 'register' ||
            (typeof window !== 'undefined' && window.location.hash === '#register');
        if (!hashRegister) {
            return;
        }
        const next = new URLSearchParams(searchParams);
        next.set('account', accRaw);
        next.set('flow', 'register');
        next.delete('register');
        navigate(
            {
                pathname: location.pathname || '/',
                search: next.toString() ? `?${next.toString()}` : '',
                hash: 'register',
            },
            { replace: true },
        );
    }, [searchParams, location.hash, location.pathname, navigate]);

    function openRegisterForm() {
        const next = new URLSearchParams(searchParams);
        const fromUrl = next.get('account') ?? next.get('register');
        const acc =
            fromUrl === 'normal' || fromUrl === 'publisher' ? fromUrl : account ?? 'normal';
        if (acc === 'normal' || acc === 'publisher') {
            next.set('account', acc);
        }
        next.delete('register');
        next.set('flow', 'register');
        navigateRegister(next);
    }

    function backToAuthChoice() {
        const next = new URLSearchParams(searchParams);
        next.delete('flow');
        navigateRegister(next);
    }

    const loginHref = account ? buildLoginHref(account) : '/login';

    if (!registerSectionOpen) {
        return null;
    }

    return (
        <section className="border-b border-white/[0.06] bg-[#0B0F1A]/50 py-6 sm:py-10 lg:py-14" id="register">
            <div className="mx-auto max-w-6xl px-3 sm:px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <div className="flex justify-center">
                        <AppLogo alt="RM Survey" className="mx-auto h-24 w-24 sm:h-32 sm:w-32" />
                    </div>
                    {!showRegisterForm ? (
                        <>
                            <h2 className="mt-3 text-xl font-bold leading-tight tracking-tight text-white sm:mt-4 sm:text-3xl lg:text-4xl">
                                {account === 'publisher' ? 'Publisher' : 'Panelist user'} — login or register
                            </h2>
                            <p className="mt-1.5 text-sm text-slate-300 sm:mt-2 sm:text-lg">Pick how you want to continue</p>
                        </>
                    ) : (
                        <>
                            <h2 className="mt-3 text-xl font-bold leading-tight tracking-tight text-white sm:mt-4 sm:text-3xl lg:text-4xl">
                                {account === 'publisher' ? 'Publisher registration' : 'Panelist user registration'}
                            </h2>
                            <p className="mt-1.5 text-sm text-slate-300 sm:mt-2 sm:text-lg">We’ll email you a one-time code to verify.</p>
                        </>
                    )}
                </div>

                {!showRegisterForm ? (
                    <div className="mt-8 sm:mt-14">
                        <div className="mx-auto max-w-lg space-y-3 sm:space-y-4">
                            <Link to={loginHref} className={actionBtnLogin}>
                                <span className="font-semibold sm:text-lg">Log in</span>
                            </Link>
                            <button type="button" className={actionBtnRegister} onClick={openRegisterForm}>
                                <span className="font-semibold sm:text-lg">Register</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-8 sm:mt-12">
                        {refParam ? null : (
                            <div className="mb-4 flex flex-wrap justify-center sm:mb-8">
                                <button
                                    type="button"
                                    onClick={backToAuthChoice}
                                    className="rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.1] sm:px-4 sm:py-2 sm:text-sm"
                                >
                                    ← Back
                                </button>
                            </div>
                        )}
                        <div className="mx-auto max-w-xl px-0 sm:px-0">
                            <RegisterCard
                                eyebrow={account === 'publisher' ? 'Publisher' : 'Member'}
                                title={account === 'publisher' ? 'Publisher registration' : 'Panelist user registration'}
                                userType={account}
                                otpBypass={otpBypass}
                                urlRef={urlRef}
                                urlSide={urlSide}
                            />
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

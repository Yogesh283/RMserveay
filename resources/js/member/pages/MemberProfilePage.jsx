import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PhoneInput, { isPossiblePhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import AppLogo from '../../components/AppLogo';
import PasswordField from '../../components/PasswordField';
import { prepareSanctum } from '../../lib/auth';
import { describeAxiosNetworkError } from '../../lib/axiosErrorMessage';
import { RmsButton, RmsCard } from '../components/rms';

const labelCls = 'block text-[9px] font-semibold uppercase tracking-wide text-[#A0AEC0] sm:text-[10px]';
const inputCls =
    'mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.06] px-2.5 py-2 text-[13px] text-white placeholder:text-slate-600 focus:border-[#8E6BFF]/40 focus:outline-none focus:ring-1 focus:ring-[#8E6BFF]/30 sm:px-3 sm:text-sm';

export default function MemberProfilePage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(undefined);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [profile, setProfile] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
    const [passwordOtp, setPasswordOtp] = useState('');
    const [passwordOtpSent, setPasswordOtpSent] = useState(false);
    const [sendingPasswordOtp, setSendingPasswordOtp] = useState(false);
    const [emailOtp, setEmailOtp] = useState('');
    const [emailOtpSentFor, setEmailOtpSentFor] = useState('');
    const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState(null);
    const [savedMsg, setSavedMsg] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await prepareSanctum();
                const { data } = await window.axios.get('api/user');
                if (!cancelled && data.user) {
                    const u = data.user;
                    setUser(u);
                    setName(u.name ?? '');
                    setEmail(u.email ?? '');
                    setPhone(u.phone ?? '');
                    setProfile(u.profile ?? '');
                }
            } catch {
                if (!cancelled) {
                    setUser(null);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const normalizedCurrentEmail = (user?.email ?? '').trim().toLowerCase();
    const normalizedNextEmail = email.trim().toLowerCase();
    const isEmailChanged = normalizedNextEmail !== '' && normalizedNextEmail !== normalizedCurrentEmail;

    async function onSubmit(e) {
        e.preventDefault();
        setError(null);
        setFieldErrors({});
        setSavedMsg(null);
        if (phone?.trim() && !isPossiblePhoneNumber(phone)) {
            setError('Enter a valid mobile number with country code, or leave it empty.');
            return;
        }
        if (newPassword && newPassword.length > 0 && newPassword !== newPasswordConfirmation) {
            setError('New password and confirmation do not match.');
            return;
        }
        setSaving(true);
        try {
            await prepareSanctum();
            const payload = {
                name: name.trim(),
                email: email.trim(),
                phone: phone || null,
                profile: profile.trim() || null,
            };
            if (isEmailChanged) {
                payload.email_otp = emailOtp.trim();
            }
            if (newPassword?.trim()) {
                payload.password = newPassword;
                payload.password_confirmation = newPasswordConfirmation;
                payload.current_password = currentPassword;
                payload.password_otp = passwordOtp.trim();
            }
            const { data } = await window.axios.patch('api/user', payload);
            if (data?.user) {
                setUser(data.user);
                setName(data.user.name ?? '');
                setEmail(data.user.email ?? '');
                setPhone(data.user.phone ?? '');
                setProfile(data.user.profile ?? '');
                setEmailOtp('');
                setEmailOtpSentFor('');
            }
            setCurrentPassword('');
            setNewPassword('');
            setNewPasswordConfirmation('');
            setPasswordOtp('');
            setPasswordOtpSent(false);
            setSavedMsg('Saved.');
            window.setTimeout(() => setSavedMsg(null), 3000);
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors) {
                setFieldErrors(data.errors);
            }
            setError(!err.response ? describeAxiosNetworkError(err) : data?.message ?? err.message ?? 'Could not save.');
        } finally {
            setSaving(false);
        }
    }

    async function sendEmailOtp() {
        setError(null);
        setFieldErrors((prev) => ({ ...prev, email: undefined, email_otp: undefined }));
        const nextEmail = email.trim().toLowerCase();
        if (!nextEmail) {
            setError('Enter your new email first.');
            return;
        }
        if (!isEmailChanged) {
            setError('Please enter a different email to change.');
            return;
        }
        setSendingEmailOtp(true);
        try {
            await prepareSanctum();
            const { data } = await window.axios.post('api/member/profile/email-change-otp', { email: nextEmail });
            setEmailOtpSentFor(nextEmail);
            setSavedMsg(data?.message ?? 'OTP sent to your new email.');
            window.setTimeout(() => setSavedMsg(null), 3000);
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors) {
                setFieldErrors((prev) => ({ ...prev, ...data.errors }));
            }
            setError(!err.response ? describeAxiosNetworkError(err) : data?.message ?? err.message ?? 'Could not send OTP.');
        } finally {
            setSendingEmailOtp(false);
        }
    }

    async function sendPasswordOtp() {
        setError(null);
        setFieldErrors((prev) => ({ ...prev, password_otp: undefined }));
        if (!newPassword?.trim()) {
            setError('Enter new password first.');
            return;
        }
        setSendingPasswordOtp(true);
        try {
            await prepareSanctum();
            const { data } = await window.axios.post('api/member/profile/password-change-otp');
            setPasswordOtpSent(true);
            setSavedMsg(data?.message ?? 'OTP sent to your registered email.');
            window.setTimeout(() => setSavedMsg(null), 3000);
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors) {
                setFieldErrors((prev) => ({ ...prev, ...data.errors }));
            }
            setError(!err.response ? describeAxiosNetworkError(err) : data?.message ?? err.message ?? 'Could not send OTP.');
        } finally {
            setSendingPasswordOtp(false);
        }
    }

    async function logout() {
        try {
            await prepareSanctum();
            await window.axios.post('api/logout');
        } catch {
            /* ignore */
        }
        navigate('/login?user_type=normal', { replace: true });
    }

    if (user === undefined) {
        return (
            <div className="flex min-h-[28vh] items-center justify-center text-sm text-[#A0AEC0]">
                Loading…
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="relative mx-auto max-w-lg space-y-3 sm:space-y-4">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-600/15 blur-[85px]" />
            <div className="pointer-events-none absolute -left-6 top-44 h-28 w-28 rounded-full bg-fuchsia-600/10 blur-[75px]" />
            <header className="mb-0.5 rounded-2xl border border-violet-300/15 bg-[#0b1020]/60 px-3 py-2.5 backdrop-blur-xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-transparent bg-gradient-to-r from-[#8E6BFF] to-[#6C4CF1] bg-clip-text sm:text-[11px]">
                    RM Survey
                </p>
                <h1 className="mt-0.5 text-xl font-bold tracking-tight text-white">Profile</h1>
                <p className="mt-0.5 text-xs leading-snug text-[#A0AEC0]">Update your details and password.</p>
            </header>

            <RmsCard variant="elevated" className="!rounded-[20px] !border-violet-300/20 !bg-[#0b1020]/75 !p-3 backdrop-blur-xl sm:!p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C4CF1] to-[#8E6BFF] text-lg font-bold text-white shadow-md shadow-[#6C4CF1]/25 sm:h-14 sm:w-14 sm:rounded-2xl sm:text-xl">
                        {(user.name || user.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold text-white sm:text-lg">{user.name || 'Member'}</p>
                        <p className="truncate text-xs text-[#A0AEC0] sm:text-sm">{user.email}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-[#C4B5FD] sm:text-xs">
                            User ID: <span className="font-semibold text-white">{user.login_uid ?? '—'}</span>
                            <span className="block font-sans text-[9px] font-normal leading-tight text-[#718096] sm:text-[10px]">
                                Sign in with this User ID and your password.
                            </span>
                        </p>
                        <p className="mt-0.5 font-mono text-[9px] text-[#718096] sm:text-[10px]">
                            Internal #<span className="text-[#A0AEC0]">{user.id}</span>
                        </p>
                    </div>
                </div>
            </RmsCard>

            {(user.binary_side === 'left' || user.binary_side === 'right') ? (
                <RmsCard variant="inset" className="!rounded-[18px] !border-[#8E6BFF]/30 !bg-[#0b1020]/85 !shadow-[0_0_24px_rgba(139,92,246,0.12)]" padding={false}>
                    <div className="p-3 sm:p-3.5">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#C4B5FD] sm:text-[10px]">Network placement</p>
                        <p className="mt-1.5 text-xs leading-snug text-[#E2E8F0] sm:text-sm sm:leading-relaxed">
                            You joined on the <strong className="text-white">{user.binary_side === 'left' ? 'Left' : 'Right'}</strong> leg
                            {user.sponsor_name ? (
                                <>
                                    {' '}
                                    under <span className="font-semibold text-[#C4B5FD]">{user.sponsor_name}</span>
                                </>
                            ) : null}
                            {user.sponsor_referral_code ? (
                                <>
                                    {' '}
                                    · Sponsor ref{' '}
                                    <span className="font-mono font-semibold text-[#FDE68A]">{user.sponsor_referral_code}</span>
                                </>
                            ) : null}
                            .
                        </p>
                        <p className="mt-1.5 text-[10px] text-[#718096] sm:text-[11px]">Recorded at registration — not editable.</p>
                    </div>
                </RmsCard>
            ) : null}

            <form onSubmit={onSubmit} noValidate>
                <RmsCard variant="elevated" className="!rounded-[20px] !border-violet-300/20 !bg-[#0b1020]/75 !p-3 backdrop-blur-xl sm:!p-4">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#A0AEC0] sm:text-[10px]">Your details</p>
                    <p className="mt-0.5 text-[11px] text-[#718096] sm:text-xs">You can change these anytime.</p>

                    {error ? (
                        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-200 sm:text-sm">{error}</p>
                    ) : null}
                    {savedMsg ? (
                        <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-200 sm:text-sm">{savedMsg}</p>
                    ) : null}

                    <div className="mt-3 space-y-3 sm:mt-4">
                        <div>
                            <label className={labelCls} htmlFor="pf-name">
                                Full name
                            </label>
                            <input
                                id="pf-name"
                                type="text"
                                autoComplete="name"
                                value={name}
                                onChange={(ev) => setName(ev.target.value)}
                                className={inputCls}
                                required
                            />
                            {fieldErrors.name?.[0] ? <p className="mt-1 text-xs text-red-400">{fieldErrors.name[0]}</p> : null}
                        </div>
                        <div>
                            <label className={labelCls} htmlFor="pf-email">
                                Email
                            </label>
                            <input
                                id="pf-email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(ev) => {
                                    const next = ev.target.value;
                                    setEmail(next);
                                    if (next.trim().toLowerCase() !== emailOtpSentFor) {
                                        setEmailOtp('');
                                    }
                                }}
                                className={inputCls}
                                required
                            />
                            {isEmailChanged ? (
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <RmsButton
                                        type="button"
                                        variant="ghost"
                                        className="!w-auto !px-2.5 !py-1.5 text-[11px] sm:!px-3 sm:!py-2 sm:text-xs"
                                        onClick={sendEmailOtp}
                                        disabled={sendingEmailOtp}
                                    >
                                        {sendingEmailOtp ? 'Sending OTP…' : 'Send OTP'}
                                    </RmsButton>
                                    <p className="text-[11px] text-[#94A3B8]">
                                        OTP will be sent to new email before save.
                                    </p>
                                </div>
                            ) : null}
                            {fieldErrors.email?.[0] ? <p className="mt-1 text-xs text-red-400">{fieldErrors.email[0]}</p> : null}
                            {isEmailChanged ? (
                                <div className="mt-2">
                                    <label className={labelCls} htmlFor="pf-email-otp">
                                        Email OTP
                                    </label>
                                    <input
                                        id="pf-email-otp"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        value={emailOtp}
                                        onChange={(ev) => setEmailOtp(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className={inputCls}
                                        placeholder="6-digit OTP"
                                        required={isEmailChanged}
                                    />
                                    {emailOtpSentFor === normalizedNextEmail ? (
                                        <p className="mt-1 text-[11px] text-emerald-300/90">OTP sent to {normalizedNextEmail}</p>
                                    ) : (
                                        <p className="mt-1 text-[11px] text-[#94A3B8]">Click “Send OTP” then enter the code.</p>
                                    )}
                                    {fieldErrors.email_otp?.[0] ? <p className="mt-1 text-xs text-red-400">{fieldErrors.email_otp[0]}</p> : null}
                                </div>
                            ) : null}
                        </div>
                        <div className="[&_.PhoneInput]:mt-1 [&_.PhoneInput]:w-full [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:rounded-lg [&_.PhoneInputInput]:border [&_.PhoneInputInput]:border-white/[0.1] [&_.PhoneInputInput]:bg-white/[0.06] [&_.PhoneInputInput]:px-2.5 [&_.PhoneInputInput]:py-2 [&_.PhoneInputInput]:text-sm [&_.PhoneInputInput]:text-white [&_.PhoneInputCountry]:mr-2">
                            <label className={labelCls}>Mobile</label>
                            <PhoneInput international defaultCountry="US" value={phone} onChange={setPhone} />
                            {fieldErrors.phone?.[0] ? <p className="mt-1 text-xs text-red-400">{fieldErrors.phone[0]}</p> : null}
                        </div>
                        <div>
                            <label className={labelCls} htmlFor="pf-profile">
                                About you <span className="font-normal normal-case text-[#718096]">(optional)</span>
                            </label>
                            <textarea
                                id="pf-profile"
                                rows={2}
                                value={profile}
                                onChange={(ev) => setProfile(ev.target.value)}
                                className={`${inputCls} resize-none`}
                                placeholder="Short introduction"
                            />
                            {fieldErrors.profile?.[0] ? <p className="mt-1 text-xs text-red-400">{fieldErrors.profile[0]}</p> : null}
                        </div>
                    </div>

                    <div className="mt-5 border-t border-white/10 pt-4 sm:mt-6 sm:pt-5">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#A0AEC0] sm:text-[10px]">Change password</p>
                        <p className="mt-0.5 text-[11px] text-[#718096] sm:text-xs">Leave blank to keep your current password.</p>
                        <div className="mt-3 space-y-3 sm:mt-4">
                            <PasswordField
                                id="pf-current-pw"
                                label="Current password"
                                labelClassName={labelCls}
                                value={currentPassword}
                                onChange={(ev) => setCurrentPassword(ev.target.value)}
                                inputClassName={inputCls}
                                autoComplete="current-password"
                                error={fieldErrors.current_password?.[0]}
                            />
                            <PasswordField
                                id="pf-new-pw"
                                label="New password"
                                labelClassName={labelCls}
                                value={newPassword}
                                onChange={(ev) => setNewPassword(ev.target.value)}
                                inputClassName={inputCls}
                                autoComplete="new-password"
                                error={fieldErrors.password?.[0]}
                            />
                            <PasswordField
                                id="pf-new-pw2"
                                label="Confirm new password"
                                labelClassName={labelCls}
                                value={newPasswordConfirmation}
                                onChange={(ev) => setNewPasswordConfirmation(ev.target.value)}
                                inputClassName={inputCls}
                                autoComplete="new-password"
                                error={fieldErrors.password_confirmation?.[0]}
                            />
                            {newPassword?.trim() ? (
                                <div>
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                        <RmsButton
                                            type="button"
                                            variant="ghost"
                                            className="!w-auto !px-2.5 !py-1.5 text-[11px] sm:!px-3 sm:!py-2 sm:text-xs"
                                            onClick={sendPasswordOtp}
                                            disabled={sendingPasswordOtp}
                                        >
                                            {sendingPasswordOtp ? 'Sending OTP…' : passwordOtpSent ? 'Resend Password OTP' : 'Send Password OTP'}
                                        </RmsButton>
                                        <p className="text-[11px] text-[#94A3B8]">Required for password update.</p>
                                    </div>
                                    <label className={`${labelCls} mt-2`} htmlFor="pf-password-otp">
                                        Password OTP
                                    </label>
                                    <input
                                        id="pf-password-otp"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        value={passwordOtp}
                                        onChange={(ev) => setPasswordOtp(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className={inputCls}
                                        placeholder="6-digit OTP"
                                        required={Boolean(newPassword?.trim())}
                                    />
                                    {fieldErrors.password_otp?.[0] ? <p className="mt-1 text-xs text-red-400">{fieldErrors.password_otp[0]}</p> : null}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <RmsButton type="submit" variant="neon" className="mt-4 w-full sm:mt-5" disabled={saving}>
                        {saving ? 'Saving…' : 'Save changes'}
                    </RmsButton>
                </RmsCard>
            </form>

            <div className="space-y-1.5">
                <p className="px-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-200/80 sm:text-[10px]">Quick links</p>
                {[
                    { to: '/member/transactions', label: 'Transactions', desc: 'Full ledger history' },
                    { to: '/member/wallet', label: 'Wallet & deposits', desc: 'USDT BEP-20, deposit & withdraw' },
                    { to: '/member/profile-form', label: 'Short Profile Form', desc: 'Complete survey preference details' },
                    { to: '/member/terms', label: 'Terms & conditions', desc: 'Rules and limits' },
                ].map((item) => (
                    <Link key={item.to} to={item.to}>
                        <RmsCard variant="inset" className="!rounded-[16px] !border-violet-300/20 !bg-[#0b1020]/75 !p-0 transition hover:border-[#8E6BFF]/35 active:scale-[0.99]" padding={false}>
                            <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-3.5 sm:py-3">
                                <div>
                                    <p className="text-sm font-semibold text-white">{item.label}</p>
                                    <p className="text-[11px] text-[#A0AEC0] sm:text-xs">{item.desc}</p>
                                </div>
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-violet-300/25 bg-violet-500/10 text-violet-200">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </span>
                            </div>
                        </RmsCard>
                    </Link>
                ))}
            </div>

            <div className="flex items-center justify-center gap-1.5 py-1 opacity-80 sm:gap-2 sm:py-1.5">
                <AppLogo alt="RM Survey" className="h-9 w-9 sm:h-10 sm:w-10" />
                <span className="text-[11px] font-semibold text-[#A0AEC0] sm:text-xs">RM Survey</span>
            </div>

            <RmsButton variant="danger" className="w-full !border !border-red-400/35 !bg-gradient-to-r !from-red-600/90 !to-rose-600/90 !shadow-[0_10px_24px_rgba(239,68,68,0.22)]" onClick={logout}>
                Logout
            </RmsButton>
        </div>
    );
}

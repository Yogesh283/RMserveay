import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageShell from '../components/PageShell';
import PasswordField from '../components/PasswordField';
import { prepareSanctum } from '../lib/auth';
import { describeAxiosNetworkError } from '../lib/axiosErrorMessage';
import { buzz, buzzError, buzzSuccess } from '../lib/haptics';

export default function AuthForgotPasswordPage() {
    const { t } = useTranslation();

    const [loginUid, setLoginUid] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    const [otpSending, setOtpSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [otpBypass, setOtpBypass] = useState(false);
    const [done, setDone] = useState(false);

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

    async function sendResetOtp() {
        setError(null);
        setFieldErrors({});
        const uid = loginUid.trim();
        if (uid.length < 3) {
            buzzError();
            setError('Enter your User ID (at least 3 characters).');
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
                purpose: 'password_reset',
                login_uid: uid,
            });
            buzzSuccess();
        } catch (err) {
            buzzError();
            const data = err.response?.data;
            if (data?.errors) {
                setFieldErrors(data.errors);
            }
            setError(data?.message ?? err.message ?? 'Could not send OTP.');
        } finally {
            setOtpSending(false);
        }
    }

    async function onSubmit(e) {
        e.preventDefault();
        setError(null);
        setFieldErrors({});
        const uid = loginUid.trim();
        if (uid.length < 3) {
            buzzError();
            setError('Enter your User ID.');
            return;
        }
        if (!password || password !== passwordConfirmation) {
            buzzError();
            setError('Passwords must match.');
            return;
        }
        if (!otpBypass && otp.length !== 6) {
            buzzError();
            setError('Enter the 6-digit email OTP.');
            return;
        }
        buzz(12);
        setLoading(true);
        try {
            await prepareSanctum();
            await window.axios.post('api/forgot-password/reset', {
                login_uid: uid,
                password,
                password_confirmation: passwordConfirmation,
                otp: otpBypass ? '' : otp,
            });
            buzzSuccess();
            setDone(true);
        } catch (err) {
            buzzError();
            const data = err.response?.data;
            if (data?.errors) {
                setFieldErrors(data.errors);
            }
            if (!err.response) {
                setError(describeAxiosNetworkError(err));
            } else {
                setError(data?.message ?? err.message ?? 'Could not reset password.');
            }
        } finally {
            setLoading(false);
        }
    }

    const fieldLabelCls = 'block text-xs font-medium uppercase tracking-wide text-white sm:text-sm';
    const inputCls =
        'mt-1 w-full rounded-md border border-white/[0.12] bg-black/30 px-2.5 py-2.5 text-sm leading-tight text-white placeholder:text-zinc-500 focus:border-[#7C3AED]/50 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/35 sm:mt-1.5 sm:rounded-lg sm:px-3 sm:py-3 sm:text-[15px]';

    if (done) {
        return (
            <PageShell title={t('authForgot.successTitle')} eyebrow={t('authForgot.eyebrow')} compact>
                <p className="text-sm leading-relaxed text-slate-300">{t('authForgot.successBody')}</p>
                <Link
                    to="/login"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-110 sm:rounded-lg"
                >
                    {t('authForgot.goLogin')}
                </Link>
            </PageShell>
        );
    }

    return (
        <PageShell title={t('authForgot.title')} eyebrow={t('authForgot.eyebrow')} compact>
            <p className="text-[10px] leading-tight text-slate-500 sm:text-[11px] sm:leading-snug">
                {otpBypass ? <span className="text-amber-200/90">{t('authForgot.hintBypass')}</span> : t('authForgot.hint')}
            </p>

            <form className="mt-3 max-w-md space-y-2 sm:mt-4 sm:space-y-3" onSubmit={onSubmit} noValidate>
                {error ? (
                    <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-2.5 py-1.5 text-xs text-red-200">{error}</p>
                ) : null}

                <div>
                    <label htmlFor="forgot-login-uid" className={fieldLabelCls}>
                        {t('authForgot.userId')}
                    </label>
                    <input
                        id="forgot-login-uid"
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={loginUid}
                        onChange={(ev) => setLoginUid(ev.target.value.replace(/\s/g, '').slice(0, 24))}
                        required
                        className={inputCls}
                        placeholder={t('authForgot.userIdPlaceholder')}
                    />
                    {fieldErrors.login_uid?.[0] ? <p className="mt-0.5 text-xs text-red-400">{fieldErrors.login_uid[0]}</p> : null}
                </div>

                {!otpBypass ? (
                    <div>
                        <label htmlFor="forgot-otp" className={fieldLabelCls}>
                            {t('authForgot.otp')}
                        </label>
                        <div className="mt-0.5 flex flex-col gap-1.5 sm:mt-1 sm:flex-row sm:gap-2">
                            <input
                                id="forgot-otp"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={otp}
                                onChange={(ev) => setOtp(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                                className={`${inputCls} flex-1 sm:mt-0`}
                                placeholder="6-digit code"
                            />
                            <button
                                type="button"
                                onClick={sendResetOtp}
                                disabled={otpSending}
                                className="shrink-0 rounded-md border border-[#7C3AED]/40 bg-[rgba(124,58,237,0.15)] px-2.5 py-2 text-[10px] font-semibold text-[#C4B5FD] hover:bg-[rgba(124,58,237,0.25)] disabled:opacity-50 sm:rounded-lg sm:px-3 sm:py-2.5 sm:text-xs"
                            >
                                {otpSending ? t('authForgot.sendingOtp') : t('authForgot.sendOtp')}
                            </button>
                        </div>
                        {fieldErrors.otp?.[0] ? <p className="mt-0.5 text-xs text-red-400">{fieldErrors.otp[0]}</p> : null}
                    </div>
                ) : null}

                <PasswordField
                    id="forgot-password"
                    label={t('authForgot.newPassword')}
                    labelClassName={fieldLabelCls}
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    required
                    inputClassName={inputCls}
                    autoComplete="new-password"
                    error={fieldErrors.password?.[0]}
                />

                <PasswordField
                    id="forgot-password-confirm"
                    label={t('authForgot.confirmPassword')}
                    labelClassName={fieldLabelCls}
                    value={passwordConfirmation}
                    onChange={(ev) => setPasswordConfirmation(ev.target.value)}
                    required
                    inputClassName={inputCls}
                    autoComplete="new-password"
                    error={fieldErrors.password_confirmation?.[0]}
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] py-2 text-[13px] font-semibold text-white shadow-md shadow-purple-950/40 hover:brightness-110 disabled:opacity-60 sm:rounded-lg sm:py-2.5 sm:text-sm"
                >
                    {loading ? t('authForgot.submitting') : t('authForgot.submit')}
                </button>
            </form>

            <p className="mt-4 text-center text-sm text-zinc-500 sm:mt-5">
                <Link
                    to="/login"
                    className="font-semibold text-[#93C5FD] underline decoration-[#93C5FD]/50 underline-offset-2 hover:text-white"
                >
                    {t('authForgot.backLogin')}
                </Link>
            </p>
        </PageShell>
    );
}

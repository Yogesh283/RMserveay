import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import MemberApkDownloadButton from '../components/MemberApkDownloadButton';
import PageShell from '../components/PageShell';
import PasswordField from '../components/PasswordField';
import { prepareSanctum } from '../lib/auth';
import { describeAxiosNetworkError } from '../lib/axiosErrorMessage';
import { redirectAfterAuth } from '../lib/authRedirect';
import { buzz, buzzError, buzzSuccess } from '../lib/haptics';

export default function AuthLoginPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const homeRegisterLink = useMemo(() => ({ pathname: '/register/panelist' }), []);
    const [loginUid, setLoginUid] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [remember, setRemember] = useState(false);

    const [otpSending, setOtpSending] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
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
                /* ignore — OTP stays required */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    async function sendLoginOtp() {
        setError(null);
        setFieldErrors({});
        const uid = loginUid.trim();
        if (uid.length < 3) {
            buzzError();
            setError(t('authLogin.errors.enterUserIdFirst'));
            return;
        }
        if (!window.axios?.post) {
            setError(t('authLogin.errors.pageNotLoaded'));
            return;
        }
        setOtpSending(true);
        try {
            await prepareSanctum();
            await window.axios.post('api/otp/send', {
                purpose: 'login',
                login_uid: uid,
            });
            buzzSuccess();
            setError(null);
        } catch (err) {
            buzzError();
            const data = err.response?.data;
            setError(data?.message ?? err.message ?? t('authLogin.errors.couldNotSendOtp'));
        } finally {
            setOtpSending(false);
        }
    }

    async function onSubmit(e) {
        e.preventDefault();
        setError(null);
        setFieldErrors({});
        if (!window.axios?.post) {
            buzzError();
            setError(t('authLogin.errors.pageNotLoaded'));
            return;
        }
        const uid = loginUid.trim();
        if (uid.length < 3 || !password) {
            buzzError();
            setError(t('authLogin.errors.enterUserPassword'));
            return;
        }
        if (!otpBypass && otp.length !== 6) {
            buzzError();
            setError(t('authLogin.errors.enterOtp'));
            return;
        }
        buzz(12);
        setLoading(true);
        try {
            await prepareSanctum();
            const { data } = await window.axios.post('api/login', {
                login_uid: uid,
                password,
                otp: otpBypass ? '' : otp,
                user_type: 'normal',
                remember,
            });
            buzzSuccess();
            await redirectAfterAuth(navigate, {
                from: location.state?.from,
                user: data.user,
                redirectTo: data.redirect_to,
            });
        } catch (err) {
            buzzError();
            const status = err.response?.status;
            const data = err.response?.data;
            if (data?.errors) {
                setFieldErrors(data.errors);
            }
            if (!err.response) {
                setError(describeAxiosNetworkError(err));
            } else if (status === 419) {
                setError(t('authLogin.errors.securityMismatch'));
            } else if (status === 404) {
                setError(t('authLogin.errors.apiNotFound'));
            } else {
                setError(data?.message ?? err.message ?? t('authLogin.errors.couldNotLogin'));
            }
        } finally {
            setLoading(false);
        }
    }

    const fieldLabelCls =
        'block text-xs font-medium uppercase tracking-wide text-white sm:text-sm';

    const inputCls =
        'mt-1 w-full rounded-md border border-white/[0.12] bg-black/30 px-2.5 py-2.5 text-sm leading-tight text-white placeholder:text-zinc-500 focus:border-[#7C3AED]/50 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/35 sm:mt-1.5 sm:rounded-lg sm:px-3 sm:py-3 sm:text-[15px]';

    const returnState = location.state?.from ? { from: location.state.from } : undefined;

    return (
        <PageShell title={t('authLogin.titleMember')} eyebrow={t('authLogin.eyebrowMember')} compact>
            <p className="text-[10px] leading-tight text-slate-500 sm:text-[11px] sm:leading-snug">
                {otpBypass ? (
                    <>
                        <span className="text-amber-200/90">{t('authLogin.otpBypassPrefix')}</span> {t('authLogin.otpBypassSuffix')}
                    </>
                ) : (
                    <>
                        {t('authLogin.hintUse')} <span className="text-slate-400">{t('authLogin.userId')}</span>, {t('authLogin.hintPassword')}{' '}
                        <span className="italic text-slate-500">{t('authLogin.hintOtp')}</span>.
                    </>
                )}
            </p>

            <form className="mt-3 max-w-md space-y-2 sm:mt-4 sm:space-y-3" onSubmit={onSubmit} noValidate>
                {error && (
                    <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-2.5 py-1.5 text-xs text-red-200">{error}</p>
                )}

                <div>
                    <label htmlFor="login-user-id" className={fieldLabelCls}>
                        {t('authLogin.userId')}
                    </label>
                    <input
                        id="login-user-id"
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={loginUid}
                        onChange={(ev) => setLoginUid(ev.target.value.replace(/\s/g, '').slice(0, 24))}
                        required
                        className={inputCls}
                        placeholder={t('authLogin.userIdPlaceholder')}
                    />
                    {fieldErrors.login_uid?.[0] && <p className="mt-0.5 text-xs text-red-400">{fieldErrors.login_uid[0]}</p>}
                </div>

                <PasswordField
                    id="login-password"
                    label={t('authLogin.password')}
                    labelClassName={fieldLabelCls}
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    required
                    inputClassName={inputCls}
                    autoComplete="current-password"
                    error={fieldErrors.password?.[0]}
                />

                <p className="text-right">
                    <Link
                        to="/login/forgot-password"
                        className="text-xs font-semibold text-[#93C5FD] underline decoration-[#93C5FD]/40 underline-offset-2 hover:text-white sm:text-sm"
                    >
                        {t('authForgot.forgotLinkOnLogin')}
                    </Link>
                </p>

                {!otpBypass && (
                    <div>
                        <label htmlFor="login-otp" className={fieldLabelCls}>
                            {t('authLogin.emailOtp')}{' '}
                            <span className="hidden font-normal normal-case text-white/80 sm:inline">({t('authLogin.required')})</span>
                        </label>
                        <div className="mt-0.5 flex flex-col gap-1.5 sm:mt-1 sm:flex-row sm:gap-2">
                            <input
                                id="login-otp"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={otp}
                                onChange={(ev) => setOtp(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                                className={`${inputCls} flex-1 sm:mt-0`}
                                placeholder={t('authLogin.codePlaceholder')}
                            />
                            <button
                                type="button"
                                onClick={sendLoginOtp}
                                disabled={otpSending}
                                className="shrink-0 rounded-md border border-[#7C3AED]/40 bg-[rgba(124,58,237,0.15)] px-2.5 py-2 text-[10px] font-semibold text-[#C4B5FD] hover:bg-[rgba(124,58,237,0.25)] disabled:opacity-50 sm:rounded-lg sm:px-3 sm:py-2.5 sm:text-xs"
                            >
                                {otpSending ? t('authLogin.sending') : t('authLogin.sendOtp')}
                            </button>
                        </div>
                        {fieldErrors.otp?.[0] && <p className="mt-0.5 text-xs text-red-400">{fieldErrors.otp[0]}</p>}
                    </div>
                )}

                {fieldErrors.user_type?.[0] && (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-950/25 px-2.5 py-1.5 text-xs text-amber-100">
                        {fieldErrors.user_type[0]}
                    </p>
                )}

                <label className="flex cursor-pointer items-center gap-2 text-xs text-white sm:text-sm">
                    <input
                        type="checkbox"
                        checked={remember}
                        onChange={(ev) => setRemember(ev.target.checked)}
                        className="rounded border-white/20 bg-black/30 text-[#7C3AED] focus:ring-[#7C3AED]/50"
                    />
                    {t('authLogin.rememberMe')}
                </label>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] py-2 text-[13px] font-semibold text-white shadow-md shadow-purple-950/40 hover:brightness-110 disabled:opacity-60 sm:rounded-lg sm:py-2.5 sm:text-sm"
                >
                    {loading ? t('authLogin.signingIn') : t('authLogin.logIn')}
                </button>
                <MemberApkDownloadButton />
            </form>

            <p className="mt-4 text-center text-sm leading-relaxed text-zinc-500 sm:mt-5 sm:text-base">
                {t('authLogin.newPrompt')}{' '}
                <Link
                    to={homeRegisterLink}
                    state={returnState}
                    className="font-semibold text-[#93C5FD] underline decoration-[#93C5FD]/50 underline-offset-2 hover:text-white hover:decoration-white/50"
                >
                    {t('authLogin.register')}
                </Link>
            </p>
        </PageShell>
    );
}

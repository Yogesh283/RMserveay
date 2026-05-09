import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RegisterCard from '../components/RegisterCard';
import AppLogo from '../components/AppLogo';
import { prepareSanctum } from '../lib/auth';
import { readReferralParams } from '../lib/registerReferral';

function BenefitIcon({ idx }) {
    if (idx === 0) {
        return (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.66 0-3 1.12-3 2.5S10.34 13 12 13s3 1.12 3 2.5S13.66 18 12 18m0-10V6m0 14v-2m9-6a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
    }
    if (idx === 1) {
        return (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.36-1.86M17 20H7m10 0v-2a6 6 0 00-10 0v2m0 0H2v-2a3 3 0 015.36-1.86M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 2a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM7.5 9A2.25 2.25 0 113 9a2.25 2.25 0 014.5 0z" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8l8-4 8 4-8 4-8-4zm0 8l8-4 8 4-8 4-8-4zm8-4v8" />
        </svg>
    );
}

export default function RegisterPanelistPage() {
    const { t, i18n } = useTranslation();
    const [searchParams] = useSearchParams();
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

    const referral = useMemo(() => readReferralParams(searchParams), [searchParams]);
    const benefits = useMemo(() => t('register.panelist.benefits', { returnObjects: true }), [t, i18n.resolvedLanguage]);

    return (
        <section className="relative isolate overflow-hidden">
            <div
                className="pointer-events-none absolute -left-24 top-10 h-[420px] w-[60%] rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.55),transparent_65%)] blur-[120px]"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute -right-32 top-40 h-[380px] w-[55%] rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.4),transparent_60%)] blur-[110px]"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute bottom-0 left-1/2 h-[260px] w-[80%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.28),transparent_60%)] blur-[100px]"
                aria-hidden
            />

            <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur transition hover:border-[#A78BFA]/45 hover:text-white sm:text-sm"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('register.backHome')}
                    </Link>
                    <Link
                        to="/register/publisher"
                        className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:border-amber-300/55 hover:bg-amber-500/20 sm:text-sm"
                    >
                        {t('register.switchToPublisher')}
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_minmax(420px,520px)] lg:items-start lg:gap-12">
                    <div className="order-2 text-center lg:order-1 lg:text-left">
                        <div className="mx-auto inline-flex items-center justify-center gap-3 rounded-3xl border border-[#A78BFA]/30 bg-[rgba(124,58,237,0.18)] px-4 py-2 ring-1 ring-[#A78BFA]/20 lg:mx-0">
                            <AppLogo alt="" className="h-12 w-12 rounded-xl" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#C4B5FD] sm:text-[11px]">
                                {t('register.panelist.eyebrow')}
                            </span>
                        </div>

                        <h1 className="mt-5 text-[1.9rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[2.6rem] md:text-[3.2rem] md:leading-[1.04]">
                            {t('register.panelist.becomePrefix')}{' '}
                            <span className="bg-gradient-to-r from-[#E9D5FF] via-[#60A5FA] to-[#34D399] bg-clip-text text-transparent">
                                {t('register.panelist.userPanelist')}
                            </span>
                        </h1>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base lg:mx-0">
                            {t('register.panelist.heroSub')}
                        </p>

                        <div className="mt-6 grid gap-3 sm:grid-cols-1">
                            {benefits.map((b, idx) => (
                                <div
                                    key={b.title}
                                    className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-[rgba(15,23,42,0.55)] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur sm:p-4"
                                >
                                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#A78BFA]/35 bg-gradient-to-br from-[#7C3AED]/35 to-[#22D3EE]/20 text-[#C4B5FD] shadow-[0_8px_18px_rgba(124,58,237,0.3)]">
                                        <BenefitIcon idx={idx} />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-white sm:text-base">{b.title}</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-slate-400 sm:text-[13px]">{b.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400 sm:text-xs lg:justify-start">
                            <span>{t('register.panelist.alreadyMember')}</span>
                            <Link
                                to="/login?user_type=normal"
                                className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 font-semibold text-[#C4B5FD] hover:border-[#A78BFA]/40 hover:text-white"
                            >
                                {t('register.login')}
                            </Link>
                        </div>
                    </div>

                    <div className="relative order-1 lg:order-2">
                        <div
                            className="pointer-events-none absolute -inset-2 -z-10 rounded-[24px] bg-gradient-to-br from-[#7C3AED]/40 via-[#5B6BFF]/30 to-[#22D3EE]/30 opacity-60 blur-2xl"
                            aria-hidden
                        />
                        <div className="rounded-[22px] border border-[#A78BFA]/35 bg-[#0B0F1A]/90 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.6)] sm:p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#93C5FD] sm:text-[11px]">Step 1 of 1</p>
                                    <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">Create your panelist account</h2>
                                </div>
                                <span className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-[#A78BFA]/40 bg-gradient-to-br from-[#7C3AED]/35 to-[#22D3EE]/20 text-[#C4B5FD] sm:inline-flex">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </span>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
                                {referral.ref ? (
                                    <>
                                        {t('register.panelist.inviteFrom')}{' '}
                                        <span className="font-mono font-semibold text-[#FDE68A]">{referral.ref.toUpperCase()}</span>
                                        {referral.side ? (
                                            <>
                                                {' '}
                                                {t('register.panelist.invitePlacementOn')}{' '}
                                                <span className="font-semibold text-[#FDE68A]">{referral.side === 'left' ? t('register.leftLeg') : t('register.rightLeg')}</span>.
                                            </>
                                        ) : null}
                                    </>
                                ) : (
                                    t('register.panelist.noInviteInfo')
                                )}
                            </p>
                            <div className="mt-4 sm:mt-6">
                                <RegisterCard
                                    userType="normal"
                                    otpBypass={otpBypass}
                                    urlRef={referral.ref}
                                    urlSide={referral.side}
                                    accent="panelist"
                                    surfaceClassName=""
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

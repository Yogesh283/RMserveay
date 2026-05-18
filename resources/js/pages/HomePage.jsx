import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { copyReferralParams, readReferralParams } from '../lib/registerReferral';
import { getMemberApkDownload } from '../lib/memberApk';
import RmSurveyBackdrop, { rgbaHex } from '../components/RmSurveyBackdrop';
import { RM } from '../survey-mobile/theme';

const display = "font-['Plus_Jakarta_Sans',Inter,system-ui,sans-serif]";
const muted = 'text-[#94a3b8]';
const mutedLight = 'text-[#cbd5e1]';

const surface =
    'border border-white/[0.09] bg-[rgba(15,23,42,0.42)] backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.4)]';
const surfaceHover =
    'transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-[0_24px_56px_rgba(0,0,0,0.45)]';
const glowPurple = 'shadow-[0_0_32px_rgba(124,58,237,0.38)]';
const btnPrimary =
    'bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-white ring-1 ring-[#F59E0B]/20 transition-all duration-300 ease-out hover:brightness-110 hover:shadow-[0_12px_40px_rgba(124,58,237,0.35)] active:brightness-95';
const btnGhost =
    'border border-white/[0.12] bg-white/[0.06] text-white backdrop-blur-md ring-1 ring-white/[0.06] transition-all duration-300 ease-out hover:border-white/20 hover:bg-white/[0.11] active:scale-[0.99]';

function IconResearch() {
    return (
        <svg className="h-6 w-6 text-[#93C5FD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
            />
        </svg>
    );
}

function IconConsult() {
    return (
        <svg className="h-6 w-6 text-[#93C5FD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
            />
        </svg>
    );
}

function IconChart() {
    return (
        <svg className="h-6 w-6 text-[#93C5FD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
        </svg>
    );
}

function IconProject() {
    return (
        <svg className="h-6 w-6 text-[#93C5FD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 11.25v7.5A2.25 2.25 0 0118.75 21h-13.5A2.25 2.25 0 013 18.75v-7.5a2.25 2.25 0 011.5-2.122"
            />
        </svg>
    );
}

const serviceIconList = [IconResearch, IconConsult, IconChart, IconProject];
const heroFeatureItems = [
    {
        title: 'Global Reach',
        icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9zm0 0c-2.3 2.3-3.6 5.4-3.6 9S9.7 18.7 12 21m0-18c2.3 2.3 3.6 5.4 3.6 9S14.3 18.7 12 21M3 12h18" />
            </svg>
        ),
    },
    {
        title: 'Secure & Trusted',
        icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3.2v5.7c0 4.6-3 7.6-7 9.1-4-1.5-7-4.5-7-9.1V6.2L12 3zm0 6v4m0 3h.01" />
            </svg>
        ),
    },
    {
        title: 'Actionable Insights',
        icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M7 16v-5m5 5V8m5 8V5" />
            </svg>
        ),
    },
    {
        title: 'Fair & Fast Payouts',
        icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 3L5 14h6l-1 7 9-12h-6l1-6z" />
            </svg>
        ),
    },
];

function HeroButtonIconUsers() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.36-1.86M17 20H7m10 0v-2a6 6 0 00-10 0v2m0 0H2v-2a3 3 0 015.36-1.86M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 2a2.25 2.25 0 11-4.5 0A2.25 2.25 0 0121 9zM7.5 9A2.25 2.25 0 113 9a2.25 2.25 0 014.5 0z" />
        </svg>
    );
}

function HeroButtonIconBuilding() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M9 14h.01M9 18h.01M15 10h.01M15 14h.01M15 18h.01" />
        </svg>
    );
}

function HeroButtonIconLock() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V8a4 4 0 118 0v3m-9 0h10a1 1 0 011 1v7a1 1 0 01-1 1H7a1 1 0 01-1-1v-7a1 1 0 011-1z" />
        </svg>
    );
}

function HeroButtonIconAndroid() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l1.2 2.1M15.75 4.5l-1.2 2.1M6.75 8.25h10.5M7.5 19.5h9a1.5 1.5 0 001.5-1.5v-7.5a1.5 1.5 0 00-1.5-1.5h-9a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5z"
            />
        </svg>
    );
}

function HeroButtonArrow() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
    );
}

export default function HomePage() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const mobileBanners = ['/images/bann.png', '/images/Start%20Earn.png', '/images/Start%20Panel.png', '/images/Start%20Pub.png', '/images/Panel.png'];
    const [mobileSlide, setMobileSlide] = useState(0);

    /** Panelist signup — keeps invite `ref` / `side` from the URL. */
    const registerNormalTo = useMemo(() => {
        const next = new URLSearchParams();
        copyReferralParams(searchParams, next);
        const qs = next.toString();
        return { pathname: '/register/panelist', search: qs ? `?${qs}` : '' };
    }, [searchParams]);

    const registerPublisherTo = useMemo(() => ({ pathname: '/register/publisher' }), []);
    const memberApk = useMemo(() => getMemberApkDownload(), []);

    /** Migrate any legacy register URL (`?ref=…`, `?account=…&flow=register#register`, `#register`) to the new dedicated pages. */
    useEffect(() => {
        const refQ = readReferralParams(searchParams);
        const accountRaw = searchParams.get('account') ?? searchParams.get('register');
        const account = accountRaw === 'normal' || accountRaw === 'publisher' ? accountRaw : null;
        const wantsRegister =
            location.hash === '#register' ||
            location.hash === 'register' ||
            searchParams.get('flow') === 'register' ||
            refQ.ref.length > 0;
        if (!wantsRegister) {
            return;
        }
        const target = account === 'publisher' ? '/register/publisher' : '/register/panelist';
        const params = new URLSearchParams();
        if (target === '/register/panelist') {
            copyReferralParams(searchParams, params);
        }
        const qs = params.toString();
        navigate({ pathname: target, search: qs ? `?${qs}` : '' }, { replace: true });
    }, [searchParams, location.hash, navigate]);

    const serviceItems = t('home.services', { returnObjects: true });
    const statsBullets = t('home.statsBullets', { returnObjects: true });
    const testimonials = t('home.testimonials', { returnObjects: true });

    const services = serviceIconList.map((Icon, i) => ({
        icon: Icon,
        title: serviceItems[i]?.title ?? '',
        text: serviceItems[i]?.text ?? '',
        key: `svc-${i}`,
    }));

    useEffect(() => {
        const timer = window.setInterval(() => {
            setMobileSlide((prev) => (prev + 1) % mobileBanners.length);
        }, 3200);

        return () => window.clearInterval(timer);
    }, [mobileBanners.length]);

    return (
        <div
            className={`relative min-h-screen overflow-hidden ${display} text-slate-100 antialiased`}
            style={{ backgroundColor: RM.bgDeep }}
        >
            <RmSurveyBackdrop />

            <div
                className="pointer-events-none absolute -left-1/4 top-[8%] h-[min(560px,55vh)] w-[70%] rounded-full opacity-50 blur-[100px] home-aurora"
                style={{
                    background:
                        'radial-gradient(ellipse at center, rgba(124,58,237,0.35) 0%, rgba(59,130,246,0.12) 45%, transparent 70%)',
                }}
                aria-hidden
            />
            <div
                className="pointer-events-none absolute -right-1/4 top-[28%] h-[min(420px,40vh)] w-[55%] rounded-full opacity-40 blur-[90px] home-aurora home-aurora-delay"
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.22) 0%, transparent 65%)',
                }}
                aria-hidden
            />

            <div className="relative z-10">
                {/* Desktop / tablet top banner */}
                <section className="hidden border-b border-white/[0.06] md:block">
                    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
                        <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0B0F1A] shadow-[0_22px_60px_rgba(0,0,0,0.45)]">
                            <img
                                src="/images/bann.png"
                                alt="RM Survey featured banner"
                                className="h-80 w-full object-cover sm:h-[28rem] lg:h-[34rem] xl:h-[40rem] 2xl:h-[44rem]"
                                loading="eager"
                            />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0F1A]/55 via-transparent to-transparent" />
                        </div>
                    </div>
                </section>

                {/* Mobile top banner slider */}
                <section className="border-b border-white/[0.06] md:hidden">
                    <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
                        <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0B0F1A] shadow-[0_14px_40px_rgba(0,0,0,0.4)]">
                            <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${mobileSlide * 100}%)` }}>
                                {mobileBanners.map((src, idx) => (
                                    <img key={src} src={src} alt={`Banner ${idx + 1}`} className="h-40 w-full shrink-0 object-cover" loading={idx === 0 ? 'eager' : 'lazy'} />
                                ))}
                            </div>
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0F1A]/50 via-transparent to-transparent" />
                        </div>
                        <div className="mt-2 mb-3 flex items-center justify-center gap-1.5">
                            {mobileBanners.map((_, idx) => (
                                <button
                                    key={`dot-${idx}`}
                                    type="button"
                                    onClick={() => setMobileSlide(idx)}
                                    aria-label={`Go to banner ${idx + 1}`}
                                    className={[
                                        'h-1.5 rounded-full transition-all',
                                        mobileSlide === idx ? 'w-5 bg-white/90' : 'w-2.5 bg-white/35',
                                    ].join(' ')}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Hero */}
                <section className="relative overflow-hidden border-b border-white/[0.06]">
                    <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-12 lg:pb-20 lg:pt-16">
                        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-10 xl:gap-12">
                            <div className="mx-auto max-w-4xl text-center lg:mx-0 lg:max-w-none lg:text-left">
                                <h1 className="home-animate-in home-animate-delay-1 text-[1.75rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.5rem] lg:leading-[1.06]">
                                    {t('home.heroLine1')}{' '}
                                    <span className="bg-gradient-to-r from-[#E9D5FF] via-[#60A5FA] to-[#FBBF24] bg-clip-text text-transparent">
                                        {t('home.heroGradient')}
                                    </span>
                                </h1>
                                <p
                                    className={`home-animate-in home-animate-delay-2 mx-auto mt-4 max-w-2xl text-base leading-relaxed sm:mt-5 sm:text-lg md:text-[1.2rem] md:leading-relaxed lg:mx-0 ${mutedLight}`}
                                >
                                    {t('home.heroSub')}
                                </p>
                                <div className="home-animate-in home-animate-delay-3 mx-auto mt-4 w-full max-w-lg space-y-3 sm:mx-auto sm:mt-5 lg:mx-0">
                                    <div className="relative overflow-hidden rounded-2xl border border-[#A78BFA]/35 bg-gradient-to-br from-[#060B1A]/90 via-[#070E20]/86 to-[#04070F]/92 p-2.5 shadow-[0_0_0_1px_rgba(167,139,250,0.12),0_12px_34px_rgba(2,6,23,0.72),0_0_32px_rgba(124,58,237,0.24)] backdrop-blur-xl">
                                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(124,58,237,0.22),transparent_42%),radial-gradient(circle_at_88%_100%,rgba(59,130,246,0.16),transparent_38%)]" />
                                        <div className="relative grid grid-cols-4 gap-0.5">
                                            {heroFeatureItems.map((item, idx) => (
                                                <div key={item.title} className="relative px-1.5 py-1 text-center">
                                                    {idx < heroFeatureItems.length - 1 ? <span className="pointer-events-none absolute inset-y-1 right-0 w-px bg-gradient-to-b from-transparent via-[#A78BFA]/40 to-transparent" /> : null}
                                                    <span className="mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#A78BFA]/35 bg-[#111827]/55 text-[#BFDBFE] shadow-[0_0_14px_rgba(96,165,250,0.32)]">
                                                        {item.icon}
                                                    </span>
                                                    <p className="mt-1 text-[10px] font-medium leading-tight text-white">{item.title}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <Link
                                            to={registerNormalTo}
                                            className="group inline-flex min-h-[52px] w-full items-center justify-between rounded-[18px] bg-gradient-to-r from-[#7C3AED] via-[#5B6BFF] to-[#38BDF8] px-4 py-3 text-sm font-bold text-white shadow-[0_0_30px_rgba(124,58,237,0.36),0_14px_36px_rgba(37,99,235,0.3)] ring-1 ring-[#C4B5FD]/35 transition-all duration-300 hover:brightness-110"
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-[0_0_16px_rgba(96,165,250,0.35)]">
                                                    <HeroButtonIconUsers />
                                                </span>
                                                <span>Panelist User Register</span>
                                            </span>
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/10 transition-transform group-hover:translate-x-0.5">
                                                <HeroButtonArrow />
                                            </span>
                                        </Link>
                                        <Link
                                            to={registerPublisherTo}
                                            className="group inline-flex min-h-[52px] w-full items-center justify-between rounded-[18px] bg-gradient-to-r from-[#7C3AED] via-[#5B6BFF] to-[#38BDF8] px-4 py-3 text-sm font-bold text-white shadow-[0_0_30px_rgba(124,58,237,0.34),0_14px_36px_rgba(37,99,235,0.28)] ring-1 ring-[#C4B5FD]/35 transition-all duration-300 hover:brightness-110"
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-[0_0_16px_rgba(147,197,253,0.3)]">
                                                    <HeroButtonIconBuilding />
                                                </span>
                                                <span>Publisher User Register</span>
                                            </span>
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/10 transition-transform group-hover:translate-x-0.5">
                                                <HeroButtonArrow />
                                            </span>
                                        </Link>
                                        <Link
                                            to="/login"
                                            className="group inline-flex min-h-[52px] w-full items-center justify-between rounded-[18px] border border-[#A78BFA]/30 bg-[linear-gradient(140deg,rgba(15,23,42,0.72),rgba(15,23,42,0.42))] px-4 py-3 text-sm font-semibold text-white shadow-[0_0_22px_rgba(59,130,246,0.2),0_10px_30px_rgba(2,6,23,0.52)] backdrop-blur-xl ring-1 ring-[#60A5FA]/15 transition-all duration-300 hover:border-[#C4B5FD]/45 hover:bg-[linear-gradient(140deg,rgba(15,23,42,0.8),rgba(15,23,42,0.52))]"
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] shadow-[0_0_14px_rgba(124,58,237,0.22)]">
                                                    <HeroButtonIconLock />
                                                </span>
                                                <span>Log in</span>
                                            </span>
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-[#C4B5FD] transition-transform group-hover:translate-x-0.5">
                                                <HeroButtonArrow />
                                            </span>
                                        </Link>
                                        {memberApk.available ? (
                                            <a
                                                href={memberApk.url}
                                                download
                                                className="home-apk-highlight group relative mt-1 inline-flex min-h-[58px] w-full items-center justify-between overflow-hidden rounded-[18px] border-2 border-emerald-300/80 bg-gradient-to-r from-[#10B981] via-[#14B8A6] to-[#22D3EE] px-4 py-3.5 text-sm font-bold text-white ring-2 ring-emerald-200/40 transition-all duration-300 hover:scale-[1.02] hover:brightness-110 active:scale-[0.99]"
                                            >
                                                <span
                                                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.22)_50%,transparent_65%)] opacity-60"
                                                    aria-hidden
                                                />
                                                <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl" aria-hidden />
                                                <span className="relative inline-flex min-w-0 flex-1 items-center gap-2.5">
                                                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/35 bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.35)]">
                                                        <HeroButtonIconAndroid />
                                                    </span>
                                                    <span className="text-left leading-tight">
                                                        <span className="flex flex-wrap items-center gap-2">
                                                            <span className="block text-[15px] tracking-tight drop-shadow-sm">{t('home.downloadApk')}</span>
                                                            <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 shadow-sm">
                                                                {t('home.downloadApkBadge')}
                                                            </span>
                                                        </span>
                                                        <span className="mt-0.5 block text-[11px] font-medium text-emerald-50/95">{t('home.downloadApkHint')}</span>
                                                    </span>
                                                </span>
                                                <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/15 text-white transition-transform group-hover:translate-x-0.5">
                                                    <HeroButtonArrow />
                                                </span>
                                            </a>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                            <div className="home-animate-in home-animate-delay-2 relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
                                <div
                                    className={`relative overflow-hidden rounded-2xl border border-white/[0.12] shadow-[0_20px_56px_rgba(0,0,0,0.45)] ring-1 ring-[#7C3AED]/20 transition-all duration-500 ease-out hover:ring-[#7C3AED]/35 sm:rounded-3xl`}
                                >
                                    <img
                                        src="/images/rm1.png"
                                        alt=""
                                        className="h-auto w-full object-cover object-center"
                                        loading="eager"
                                        decoding="async"
                                        fetchPriority="high"
                                    />
                                    <div
                                        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#0B0F1A]/55 via-transparent to-[#3B82F6]/10"
                                        aria-hidden
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* User panelist callout */}
                <section className="border-b border-white/[0.06] py-8 sm:py-10">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <div
                            className={`grid items-center gap-5 overflow-hidden rounded-2xl border border-[#7C3AED]/25 bg-gradient-to-br from-[rgba(124,58,237,0.16)] via-[rgba(15,23,42,0.72)] to-[rgba(59,130,246,0.12)] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.38)] sm:rounded-3xl sm:p-6 md:grid-cols-[1.05fr_1fr] md:gap-8`}
                        >
                            <div className="order-2 md:order-1">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#93C5FD]">Join RM Survey</p>
                                <h3 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">Become a User Panelist</h3>
                                <p className={`mt-2 text-sm leading-relaxed sm:text-base ${muted}`}>
                                    Start as a panelist user, complete surveys, and get rewards in a clear and transparent workflow.
                                </p>
                                <Link
                                    to={registerNormalTo}
                                    className={`mt-4 inline-flex min-h-[42px] items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold sm:min-h-[46px] sm:text-base ${btnPrimary}`}
                                >
                                    User panelist
                                </Link>
                            </div>
                            <div className="order-1 md:order-2">
                                <div className="relative overflow-hidden rounded-xl border border-white/[0.12] shadow-[0_14px_40px_rgba(0,0,0,0.4)] sm:rounded-2xl">
                                    <img src="/images/rm3.png" alt="RM Survey panelist" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#0B0F1A]/45 via-transparent to-[#3B82F6]/15" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Services */}
                <section className="border-b border-white/[0.06] py-10 sm:py-14">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-[2.35rem] md:leading-tight">
                                {t('home.whatWeDo')}
                            </h2>
                            <p className={`mt-3 text-sm leading-relaxed sm:text-base ${muted}`}>{t('home.whatWeDoSub')}</p>
                        </div>
                        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
                            {services.map(({ icon: Icon, title, text, key }) => (
                                <div key={key} className={`group relative flex flex-col rounded-2xl p-5 sm:rounded-3xl sm:p-6 ${surface} ${surfaceHover}`}>
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED]/30 to-[#3B82F6]/15 ring-1 ring-white/10 transition-transform duration-300 ease-out group-hover:scale-105 sm:mb-4 sm:h-11 sm:w-11 sm:rounded-2xl">
                                        <Icon />
                                    </div>
                                    <h3 className="text-base font-bold leading-snug text-white sm:text-lg">{title}</h3>
                                    <p className={`mt-2 flex-1 text-sm leading-relaxed sm:text-[15px] ${muted}`}>{text}</p>
                                    <Link
                                        to="/why-join-us"
                                        className={`mt-3 inline-flex items-center text-xs font-semibold text-[#93C5FD] transition-all duration-300 ease-out hover:text-white sm:mt-4 sm:text-sm`}
                                    >
                                        {t('home.learnMore')}
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Stats + visual */}
                <section className="border-b border-white/[0.06] py-10 sm:py-14">
                    <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-2 lg:gap-12">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{t('home.statsTitle')}</h2>
                            <p className={`mt-3 text-sm leading-relaxed sm:text-base ${muted}`}>{t('home.statsSub')}</p>
                            <ul className="mt-5 space-y-3 sm:mt-6 sm:space-y-3.5">
                                {Array.isArray(statsBullets) &&
                                    statsBullets.map((item) => (
                                        <li key={item} className={`flex gap-3 text-sm leading-relaxed sm:text-base ${mutedLight}`}>
                                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25">
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                            </ul>
                            <Link
                                to="/why-join-us"
                                className={`mt-6 inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300 ease-out sm:mt-8 sm:rounded-2xl sm:px-6 sm:py-3 sm:text-base ${btnPrimary} ${glowPurple}`}
                            >
                                {t('home.whyJoin')}
                            </Link>
                        </div>
                        <div className="relative">
                            <div
                                className={`relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#7C3AED]/25 shadow-[0_20px_52px_rgba(0,0,0,0.4)] transition-transform duration-500 ease-out hover:scale-[1.01] sm:rounded-3xl`}
                            >
                                <img
                                    src="/images/rm2.png"
                                    alt=""
                                    className="absolute inset-0 h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                />
                                <div
                                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1e1b4b]/45 via-[#0B0F1A]/65 to-[#0F172A]/80"
                                    aria-hidden
                                />
                                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/25 to-transparent p-4 sm:p-6">
                                    <p className="text-xs font-semibold text-[#FDE68A] sm:text-sm">{t('home.visualEyebrow')}</p>
                                    <p className="mt-0.5 text-xl font-bold text-white sm:mt-1 sm:text-2xl md:text-3xl">{t('home.visualTitle')}</p>
                                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                                        <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#7C3AED] via-[#3B82F6] to-[#F59E0B] transition-all duration-700 ease-out" />
                                    </div>
                                    <p className={`mt-2 text-xs ${muted}`}>{t('home.visualBar')}</p>
                                </div>
                            </div>
                            <div
                                className={`absolute -bottom-4 -right-2 hidden rounded-2xl border border-white/[0.1] px-5 py-4 shadow-[0_16px_48px_rgba(0,0,0,0.4)] sm:block ${surface}`}
                            >
                                <p className="text-3xl font-bold tracking-tight text-white">{t('home.statNumber')}</p>
                                <p className={`mt-1 text-xs font-medium uppercase tracking-wider ${muted}`}>{t('home.statLabel')}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Testimonials */}
                <section className="border-b border-white/[0.06] py-10 sm:py-14">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{t('home.voicesTitle')}</h2>
                            <p className={`mt-3 text-sm leading-relaxed sm:text-base ${muted}`}>{t('home.voicesSub')}</p>
                        </div>
                        <div className="mt-8 grid gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6">
                            {Array.isArray(testimonials) &&
                                testimonials.map((row, idx) => (
                                    <blockquote
                                        key={`${row.name}-${idx}`}
                                        className={`flex flex-col rounded-2xl p-5 sm:rounded-3xl sm:p-6 ${surface} ${surfaceHover}`}
                                    >
                                        <span className="font-serif text-4xl leading-none text-[#7C3AED]/40 sm:text-5xl" aria-hidden>
                                            “
                                        </span>
                                        <p className={`mt-1 flex-1 text-[15px] leading-relaxed sm:mt-2 sm:text-[16px] ${mutedLight}`}>{row.quote}</p>
                                        <footer className="mt-5 border-t border-white/[0.08] pt-4 sm:mt-6 sm:pt-5">
                                            <p className="text-sm font-bold text-white sm:text-base">{row.name}</p>
                                            <p className={`mt-0.5 text-xs sm:text-sm ${muted}`}>{row.place}</p>
                                        </footer>
                                    </blockquote>
                                ))}
                        </div>
                    </div>
                </section>

                {/* Locales hint */}
                <section className="border-b border-white/[0.06] py-6 sm:py-8">
                    <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
                        <p className={`text-xs leading-relaxed sm:text-sm ${muted}`}>{t('home.localesLine')}</p>
                    </div>
                </section>
            </div>
        </div>
    );
}

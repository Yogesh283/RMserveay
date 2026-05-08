import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RegisterCard from '../components/RegisterCard';
import AppLogo from '../components/AppLogo';
import { prepareSanctum } from '../lib/auth';

const features = [
    {
        title: 'Launch surveys in minutes',
        text: 'Build, preview, and ship targeted surveys with a step-by-step studio.',
    },
    {
        title: 'Reach the right audience',
        text: 'Filter respondents by tier, geography, and behaviour to get the cleanest data.',
    },
    {
        title: 'Real-time analytics',
        text: 'Watch responses, completion rate, and spend update live on your dashboard.',
    },
    {
        title: 'Secure crypto-ready payouts',
        text: 'Top-up via NowPayments, withdraw to USDT BEP-20, with full audit trail.',
    },
];

function FeatureIcon({ idx }) {
    const props = { className: 'h-4 w-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.8 };
    if (idx === 0) {
        return (
            <svg {...props}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        );
    }
    if (idx === 1) {
        return (
            <svg {...props}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 6a7 7 0 100 14 7 7 0 000-14z" />
            </svg>
        );
    }
    if (idx === 2) {
        return (
            <svg {...props}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13v8m4-12v12m4-16v16m4-10v10m4-7v7" />
            </svg>
        );
    }
    return (
        <svg {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m9-9H3" />
        </svg>
    );
}

export default function RegisterPublisherPage() {
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

    return (
        <section className="relative isolate overflow-hidden">
            <div
                className="pointer-events-none absolute -right-32 top-0 h-[480px] w-[60%] rounded-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.45),transparent_60%)] blur-[120px]"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute -left-24 top-32 h-[380px] w-[55%] rounded-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.32),transparent_60%)] blur-[110px]"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute bottom-0 right-1/4 h-[260px] w-[60%] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.3),transparent_60%)] blur-[100px]"
                aria-hidden
            />

            <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur transition hover:border-amber-300/45 hover:text-white sm:text-sm"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to home
                    </Link>
                    <Link
                        to="/register/panelist"
                        className="inline-flex items-center gap-2 rounded-full border border-[#A78BFA]/35 bg-[rgba(124,58,237,0.12)] px-3 py-1.5 text-xs font-semibold text-[#C4B5FD] transition hover:border-[#A78BFA]/55 hover:bg-[rgba(124,58,237,0.22)] sm:text-sm"
                    >
                        Switch to Panelist
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(420px,500px)_1fr] lg:items-start lg:gap-12">
                    <div className="order-2 lg:order-1">
                        <div className="relative">
                            <div
                                className="pointer-events-none absolute -inset-2 -z-10 rounded-[24px] bg-gradient-to-br from-[#F59E0B]/40 via-[#F97316]/30 to-[#3B82F6]/25 opacity-60 blur-2xl"
                                aria-hidden
                            />
                            <div className="rounded-[22px] border border-amber-300/35 bg-[#0B0F1A]/85 p-3 shadow-[0_18px_60px_rgba(2,6,23,0.6)] sm:p-5">
                                <div className="rounded-[18px] border border-white/[0.06] bg-[rgba(15,23,42,0.7)] p-3 sm:p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200 sm:text-[11px]">Publisher onboarding</p>
                                            <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">Open a Publisher account</h2>
                                        </div>
                                        <span className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/40 bg-gradient-to-br from-[#F59E0B]/35 to-[#F97316]/20 text-amber-100 sm:inline-flex">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M9 14h.01M9 18h.01M15 10h.01M15 14h.01M15 18h.01" />
                                            </svg>
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
                                        Publishers can create surveys, target respondents, and run analytics. Referral codes don’t apply for publisher accounts.
                                    </p>
                                    <div className="mt-4 sm:mt-6">
                                        <RegisterCard
                                            userType="publisher"
                                            otpBypass={otpBypass}
                                            accent="publisher"
                                            surfaceClassName="rounded-[16px] border border-white/[0.05] bg-black/20 p-3 sm:p-4"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="order-1 text-center lg:order-2 lg:text-left">
                        <div className="mx-auto inline-flex items-center justify-center gap-3 rounded-3xl border border-amber-300/35 bg-[rgba(245,158,11,0.16)] px-4 py-2 ring-1 ring-amber-300/20 lg:mx-0">
                            <AppLogo alt="" className="h-9 w-9 rounded-xl" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-100 sm:text-[11px]">Publisher</span>
                        </div>

                        <h1 className="mt-5 text-[1.9rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[2.6rem] md:text-[3.2rem] md:leading-[1.04]">
                            Publish surveys.{' '}
                            <span className="bg-gradient-to-r from-[#FDE68A] via-[#FBBF24] to-[#F87171] bg-clip-text text-transparent">
                                Find your audience.
                            </span>
                        </h1>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base lg:mx-0">
                            Run targeted surveys, top-up your wallet, and pay respondents only for verified responses — all from a single, transparent dashboard.
                        </p>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            {features.map((f, idx) => (
                                <div
                                    key={f.title}
                                    className="flex items-start gap-3 rounded-2xl border border-amber-300/15 bg-[rgba(35,21,8,0.55)] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur sm:p-4"
                                >
                                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-300/40 bg-gradient-to-br from-[#F59E0B]/30 to-[#EF4444]/20 text-amber-100">
                                        <FeatureIcon idx={idx} />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-white sm:text-[15px]">{f.title}</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-slate-300/85 sm:text-[13px]">{f.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400 sm:text-xs lg:justify-start">
                            <span>Already publishing?</span>
                            <Link
                                to="/login?user_type=publisher"
                                className="rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1.5 font-semibold text-amber-100 hover:border-amber-300/55 hover:bg-amber-500/20"
                            >
                                Log in to dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

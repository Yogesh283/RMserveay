import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { prepareSanctum } from '../../lib/auth';
import { RmsCard } from '../components/rms';

function IconArrow() {
    return (
        <svg className="h-4 w-4 text-violet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
    );
}

export default function MemberWalletHubPage() {
    const { t, i18n } = useTranslation();
    const [overview, setOverview] = useState(null);
    const [err, setErr] = useState(null);

    const fmtUsd = useCallback(
        (s) => {
            const n = Number.parseFloat(s);
            if (Number.isNaN(n)) return s;
            try {
                return new Intl.NumberFormat(i18n.language || 'en', { style: 'currency', currency: 'USD' }).format(n);
            } catch {
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
            }
        },
        [i18n.language],
    );

    const load = useCallback(async () => {
        setErr(null);
        try {
            await prepareSanctum();
            const { data } = await window.axios.get('api/member/wallet/overview');
            setOverview(data);
        } catch (e) {
            setErr(e.response?.data?.message ?? e.message ?? t('member.ui.failedToLoad'));
        }
    }, [t]);

    useEffect(() => {
        load();
    }, [load]);

    const quickLinks = useMemo(
        () => [
            {
                to: '/member/wallet/deposit',
                label: t('member.walletHub.deposit'),
                subtitle: 'Top up your main wallet',
                icon: (
                    <svg className="h-5 w-5 text-violet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                    </svg>
                ),
            },
            {
                to: '/member/wallet/internal',
                label: t('member.ui.mainP2p'),
                subtitle: 'Move balance instantly',
                icon: (
                    <svg className="h-5 w-5 text-violet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h11m0 0-3-3m3 3-3 3M17 16H6m0 0 3 3m-3-3 3-3" />
                    </svg>
                ),
            },
            {
                to: '/member/wallet/p2p',
                label: t('member.walletHub.p2pSendQr'),
                subtitle: 'Send by code or QR',
                icon: (
                    <svg className="h-5 w-5 text-violet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 14h2m4 0h-2m-2 2v2m4-2v2m-2 2h2" />
                    </svg>
                ),
            },
        ],
        [t, i18n.resolvedLanguage],
    );

    const navItems = useMemo(
        () => [
            { to: '/member/dashboard', label: 'Dashboard' },
            { to: '/member/team', label: 'Team' },
            { to: '/member/surveys', label: 'Surveys' },
            { to: '/member/wallet', label: 'Wallet', active: true },
            { to: '/member/terms', label: 'More' },
        ],
        [],
    );

    return (
            <div className="relative space-y-3 overflow-hidden rounded-[26px] bg-[#070b16] p-2.5 pb-24 sm:p-3">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-600/20 blur-[90px]" />
            <div className="pointer-events-none absolute right-0 top-20 h-52 w-52 rounded-full bg-violet-600/20 blur-[90px]" />
            <div className="pointer-events-none absolute bottom-16 left-0 h-44 w-44 rounded-full bg-violet-500/10 blur-[90px]" />

            {err ? <p className="text-sm text-red-400">{err}</p> : null}

           

            <div className="relative overflow-hidden rounded-[22px] border border-sky-400/35 bg-gradient-to-br from-sky-500/[0.08] to-[#0b1020]/85 p-3 shadow-[0_0_28px_rgba(56,189,248,0.15)] backdrop-blur-xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-200/90">SURVEY WALLET</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-white">
                    {overview ? fmtUsd(overview.survey_wallet_balance) : t('member.ui.dash')}
                </p>
                <p className="mt-1 text-xs text-[#94A3B8]">Survey completion rewards are credited here.</p>
            </div>

            <div className="relative overflow-hidden rounded-[22px] border border-violet-400/35 bg-gradient-to-br from-white/[0.07] to-[#0b1020]/85 p-3 shadow-[0_0_32px_rgba(108,76,241,0.2)] backdrop-blur-xl">
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-2xl" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a5b4fc]">YOUR MAIN WALLET</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-white">
                    {overview ? fmtUsd(overview.wallet_balance) : t('member.ui.dash')}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                        to="/member/wallet/withdraw"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(168,85,247,0.4)] transition hover:brightness-110 active:scale-[0.99]"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0-7-7m7 7V3" />
                        </svg>
                        {t('member.walletHub.withdraw')}
                    </Link>
                    <Link
                        to="/member/wallet/deposit"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-300/45 bg-[#0a1020]/70 px-3 py-2.5 text-sm font-semibold text-violet-100 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2),0_0_24px_rgba(139,92,246,0.16)] transition hover:border-violet-300/70 active:scale-[0.99]"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                        </svg>
                        {t('member.walletHub.deposit')}
                    </Link>
                </div>
            </div>

            <RmsCard variant="elevated" className="!rounded-[20px] !border-violet-300/20 !bg-[#0b1020]/70 !p-0 backdrop-blur-xl">
                <div className="px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-200/80">{t('member.walletHub.quickLinks')}</p>
                </div>
                <div className="divide-y divide-white/10">
                    {quickLinks.map((l) => (
                        <Link
                            key={l.to}
                            to={l.to}
                            className="group flex items-center gap-2.5 px-3 py-3 transition hover:bg-violet-500/10"
                        >
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 shadow-[0_0_16px_rgba(139,92,246,0.2)]">
                                {l.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-white">{l.label}</p>
                                <p className="truncate text-xs text-[#94A3B8]">{l.subtitle}</p>
                            </div>
                            <span className="transition group-hover:translate-x-0.5">
                                <IconArrow />
                            </span>
                        </Link>
                    ))}
                </div>
            </RmsCard>

            <div className="rounded-[20px] border border-violet-300/22 bg-gradient-to-r from-[#101528]/90 via-[#101a32]/90 to-[#161736]/90 px-3 py-2.5 shadow-[0_0_24px_rgba(139,92,246,0.12)]">
                <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-300/35 bg-violet-500/15 shadow-[0_0_18px_rgba(139,92,246,0.25)]">
                        <svg className="h-5 w-5 text-violet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12.5l1.8 1.8 3.2-3.2" />
                        </svg>
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">Safe & Secure Transactions</p>
                        <p className="mt-0.5 text-xs text-[#94A3B8]">Every wallet operation is protected with secure verification and encrypted transfer flow.</p>
                        <span className="mt-2 inline-flex rounded-full border border-violet-300/35 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-200">
                            100% Secure
                        </span>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-2 left-1/2 z-20 w-[min(460px,calc(100vw-16px))] -translate-x-1/2 rounded-[24px] border border-white/10 bg-[#0b1020]/90 p-2 shadow-[0_20px_44px_rgba(0,0,0,0.5)] backdrop-blur-xl md:hidden">
                <div className="grid grid-cols-5 gap-1 text-[10px]">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            to={item.to}
                            className={`flex min-h-[44px] items-center justify-center rounded-xl px-1 font-semibold transition ${
                                item.active
                                    ? 'bg-gradient-to-br from-violet-600/60 to-fuchsia-600/50 text-white shadow-[0_0_22px_rgba(139,92,246,0.45)] ring-1 ring-violet-300/40'
                                    : 'text-[#A0AEC0] hover:bg-white/[0.05] hover:text-white'
                            }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

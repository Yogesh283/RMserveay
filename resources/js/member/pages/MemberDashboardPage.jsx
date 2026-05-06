import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { prepareSanctum } from '../../lib/auth';
import { formatTransactionDetailRow } from '../lib/formatTransactionDetail';
import { RmsButtonLink, RmsCard } from '../components/rms';

export default function MemberDashboardPage() {
    const { t, i18n } = useTranslation();
    const [user, setUser] = useState(null);
    const [summary, setSummary] = useState(null);
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
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
        setLoading(true);
        try {
            await prepareSanctum();
            const [u, sum, ov] = await Promise.all([
                window.axios.get('api/user'),
                window.axios.get('api/member/dashboard/summary'),
                window.axios.get('api/member/wallet/overview'),
            ]);
            setUser(u.data.user);
            setSummary(sum.data);
            setOverview(ov.data);
        } catch (e) {
            setErr(e.response?.data?.message ?? e.message ?? t('member.dashboard.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        load();
    }, [load]);

    /** Refresh when member returns to this tab (e.g. after completing a survey). */
    useEffect(() => {
        function onVisible() {
            if (document.visibilityState === 'visible') {
                load();
            }
        }
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [load]);

    const e = summary?.earnings_summary_usd;
    const q = summary?.quick_stats;

    /** Mirrored from `wallet` / `users` (main = spend/withdraw; P2P = internal pool). */
    const mainWalletUsd = overview?.wallet_balance ?? summary?.wallet_main_usd ?? user?.wallet_balance;
    const p2pWalletUsd = overview?.p2p_wallet_balance ?? summary?.wallet_p2p_usd ?? user?.p2p_wallet_balance;

    const earningCards = useMemo(() => {
        if (!summary || !e) return [];
        return [
            {
                label: t('member.dashboard.earnTotal'),
                value: fmtUsd(e.total_from_programme),
                to: '/member/programme',
            },
            {
                label: t('member.dashboard.earnDirect'),
                value: fmtUsd(e.direct_income),
                to: '/member/direct-income',
                hint: t('member.dashboard.earnDirectHint'),
            },
            {
                label: t('member.dashboard.earnLevel'),
                value: fmtUsd(e.level_income),
                to: '/member/level-income',
                hint: t('member.dashboard.earnLevelHint'),
            },
            {
                label: t('member.dashboard.earnMatching'),
                value: fmtUsd(e.matching_income),
                to: '/member/panel-matching',
                hint: t('member.dashboard.earnMatchingHint'),
            },
        ];
    }, [summary, e, t, fmtUsd, i18n.resolvedLanguage]);

    function txLabel(type) {
        const key = `member.dashboard.tx.${type}`;
        return t(key, { defaultValue: String(type).replace(/_/g, ' ') });
    }

    const surveySubtext = useMemo(() => {
        if (q?.completed_surveys_count != null) {
            return t('member.dashboard.surveysDoneTap', { done: q.completed_surveys_count });
        }
        return t('member.dashboard.tapToOpen');
    }, [q?.completed_surveys_count, t, i18n.resolvedLanguage]);

    return (
        <div className="relative space-y-4 pb-24">
            <div className="rounded-[24px] border border-white/10 bg-gradient-to-br from-[#050816]/95 via-[#0B1120]/95 to-[#050816]/95 p-4 shadow-[0_20px_48px_rgba(0,0,0,0.45)]">
                <div className="relative overflow-hidden rounded-[24px] border border-[#8B5CF6]/30 bg-gradient-to-r from-[#1a1030] via-[#0d1428] to-[#1b130a] p-4 shadow-[0_16px_38px_rgba(76,29,149,0.28)]">
                    <div className="pointer-events-none absolute -right-7 -top-8 h-28 w-28 rounded-full bg-[#7C3AED]/25 blur-2xl" />
                    <div className="pointer-events-none absolute -left-6 bottom-0 h-16 w-16 rounded-full bg-cyan-400/15 blur-2xl" />
                    <div className="relative flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#8B5CF6]/50 bg-[#7C3AED]/25 text-white shadow-[0_0_18px_rgba(124,58,237,0.3)]">
                                {(user?.name || 'Y').charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-300">{t('member.dashboard.welcomeBack')}</p>
                                <p className="truncate text-base font-semibold text-white">{user?.name || 'yogesh'}</p>
                                <p className="truncate text-[11px] text-slate-400">ID: {user?.login_uid || '—'}</p>
                            </div>
                        </div>
                        <div className="max-w-[48%]">
                            <p className="text-xs font-semibold text-white">Complete your ID Activation</p>
                            <p className="mt-1 text-[10px] leading-snug text-slate-300">Unlock full rewards, referrals and matching income flow.</p>
                            <Link
                                to="/member/active-panels"
                                className="mt-2 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#F59E0B] px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_10px_22px_rgba(124,58,237,0.34)]"
                            >
                                ID Activation
                                <span aria-hidden>→</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {err ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</p>
            ) : null}

            {loading ? (
                <p className="rounded-xl border border-white/10 bg-[#111827]/80 px-4 py-3 text-sm text-[#A0AEC0]">{t('member.dashboard.loadingFigures')}</p>
            ) : null}

            <RmsCard variant="elevated" className="!rounded-[24px] !border-white/10 !bg-[#0e1529]/95 !p-0" padding={false}>
                <div className="space-y-4 p-4 sm:p-5">
                    <div className="min-w-0 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0AEC0]">Total Balance</p>
                            <button type="button" className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-slate-300">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-4xl font-bold tabular-nums tracking-tight text-white sm:text-[2.5rem] sm:leading-none">
                            {mainWalletUsd != null && mainWalletUsd !== '' ? fmtUsd(mainWalletUsd) : '—'}
                        </p>
                        <RmsCard variant="inset" className="!p-0" padding={false}>
                            <div className="flex flex-wrap items-end justify-between gap-3 p-3 sm:p-3.5">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0AEC0]">
                                        {t('member.dashboard.p2pWalletTitle')}
                                    </p>
                                    <p className="mt-1 text-xl font-bold tabular-nums text-white sm:text-2xl">
                                        {p2pWalletUsd != null && p2pWalletUsd !== '' ? fmtUsd(p2pWalletUsd) : '—'}
                                    </p>
                                </div>
                                <Link
                                    to="/member/wallet/internal"
                                    className="shrink-0 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#C4B5FD] transition hover:border-[#8E6BFF]/40 hover:bg-white/[0.1] hover:text-white active:scale-[0.98]"
                                >
                                    Main ↔ P2P
                                </Link>
                            </div>
                        </RmsCard>
                        <div className="flex flex-wrap gap-2 pt-0.5">
                            <RmsButtonLink
                                to="/member/wallet/deposit"
                                variant="neon"
                                size="sm"
                                className="!w-auto flex-1 min-w-[140px] rounded-xl"
                            >
                                {t('member.dashboard.deposit')}
                            </RmsButtonLink>
                            <RmsButtonLink
                                to="/member/wallet/withdraw"
                                variant="ghost"
                                size="sm"
                                className="!w-auto flex-1 min-w-[120px] rounded-xl border-white/15 bg-white/[0.06] hover:border-[#8E6BFF]/40 hover:bg-white/[0.1]"
                            >
                                {t('member.dashboard.withdrawal')}
                            </RmsButtonLink>
                        </div>
                    </div>
                </div>
            </RmsCard>

            <div>
                <p className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0AEC0]">Quick Actions</p>
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { label: 'ID Activation', to: '/member/active-panels', color: 'from-[#7C3AED]/35 to-[#2563EB]/20' },
                        { label: 'Deposit', to: '/member/wallet/deposit', color: 'from-[#7C3AED]/35 to-[#8B5CF6]/20' },
                        { label: 'Withdraw', to: '/member/wallet/withdraw', color: 'from-[#2563EB]/35 to-[#06B6D4]/20' },
                        { label: 'Support', to: '/member/support-tickets', color: 'from-[#F59E0B]/30 to-[#7C3AED]/20' },
                    ].map((qa) => (
                        <Link key={qa.label} to={qa.to} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${qa.color} p-2.5 text-center shadow-[0_8px_20px_rgba(0,0,0,0.3)]`}>
                            <span className="mx-auto mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/20 bg-white/[0.08] text-white">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </span>
                            <p className="text-[10px] font-semibold text-white">{qa.label}</p>
                        </Link>
                    ))}
                </div>
            </div>

            <RmsCard variant="elevated" className="!rounded-[24px] !border-white/10 !bg-[#0f162b]/95 !p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">Earnings Overview</p>
                        <p className="text-[11px] text-slate-400">This Month</p>
                    </div>
                    <button className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-200">This Month</button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-[#8B5CF6]/30 bg-[#11182b]/90 p-3">
                        <div className="relative h-20 overflow-hidden rounded-xl border border-[#8B5CF6]/20 bg-black/25">
                            <div className="absolute inset-x-2 bottom-2 h-8 rounded-full border border-[#8B5CF6]/30 bg-gradient-to-r from-transparent via-[#8B5CF6]/35 to-transparent blur-[1px]" />
                            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                                <path d="M2 32 C20 30, 30 14, 46 18 C60 22, 72 8, 98 10" stroke="#A78BFA" strokeWidth="2.2" fill="none" />
                            </svg>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-cyan-400/25 bg-[#11182b]/90 p-3">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-cyan-400/25 border-t-[#06B6D4] border-r-[#F59E0B] text-center">
                            <div>
                                <p className="text-[10px] text-slate-400">Total</p>
                                <p className="text-xs font-bold text-white">{fmtUsd(e?.total_from_programme ?? 0)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-slate-300">
                    <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#8B5CF6]" />Direct</span>
                    <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#06B6D4]" />Matching</span>
                    <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#F59E0B]" />Other</span>
                </div>
            </RmsCard>

            <div>
                <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0AEC0]">Stats Summary</p>
                    <Link to="/member/transactions" className="text-xs font-semibold text-[#8E6BFF] hover:underline">
                        {t('member.dashboard.allTransactions')}
                    </Link>
                </div>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {earningCards.map((c) => (
                        <Link key={c.to} to={c.to}>
                            <RmsCard variant="inset" className="!p-3 transition hover:ring-1 hover:ring-[#8E6BFF]/30 active:scale-[0.99]" padding={false}>
                                <div className="p-3">
                                    <p className="text-[9px] font-medium uppercase tracking-wide text-[#A0AEC0]">{c.label}</p>
                                    <p className="mt-1 text-sm font-bold tabular-nums text-white">{c.value}</p>
                                    {c.hint ? (
                                        <p className="mt-0.5 text-[9px] text-[#A0AEC0]/90">{c.hint}</p>
                                    ) : null}
                                </div>
                            </RmsCard>
                        </Link>
                    ))}
                </div>
             
            </div>

            <div className="grid grid-cols-2 gap-2">
                <RmsCard variant="elevated" className="!p-3 text-center" padding={false}>
                    <div className="p-3">
                        <p className="text-[9px] font-medium uppercase tracking-wide text-[#A0AEC0]">{t('member.dashboard.surveyCredits')}</p>
                        <p className="mt-1 text-sm font-bold tabular-nums text-white">{e ? fmtUsd(e.survey_credits) : '—'}</p>
                        <p className="mt-0.5 text-[9px] text-[#A0AEC0]">{t('member.dashboard.payouts', { count: q?.survey_credits_count ?? 0 })}</p>
                    </div>
                </RmsCard>
                <Link to="/member/surveys">
                    <RmsCard variant="elevated" className="!p-3 text-center transition hover:ring-1 hover:ring-[#8E6BFF]/30 active:scale-[0.99]" padding={false}>
                        <div className="p-3">
                            <p className="text-[9px] font-medium uppercase tracking-wide text-[#A0AEC0]">{t('member.dashboard.availableSurveys')}</p>
                            <p className="mt-1 text-sm font-bold tabular-nums text-white">{q?.available_surveys_count ?? '—'}</p>
                            <p className="mt-0.5 text-[9px] text-[#A0AEC0]">{surveySubtext}</p>
                        </div>
                    </RmsCard>
                </Link>
            </div>

            <div className="flex flex-wrap gap-2">
                <Link
                    to="/member/programme"
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:border-[#8E6BFF]/35 active:scale-[0.98] min-w-[140px]"
                >
                    {t('member.dashboard.incomeProgramme')}
                </Link>
            </div>

            {overview?.recent_transactions?.length > 0 ? (
                <RmsCard variant="elevated" className="!p-0 overflow-hidden" padding={false}>
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <div>
                            <p className="text-sm font-bold text-white">{t('member.dashboard.recentActivity')}</p>
                            <p className="text-xs text-[#A0AEC0]">{t('member.dashboard.latestMovements')}</p>
                        </div>
                        <Link to="/member/transactions" className="text-xs font-semibold text-[#8E6BFF] hover:underline">
                            {t('member.dashboard.viewAll')}
                        </Link>
                    </div>
                    <ul className="divide-y divide-white/5">
                        {overview.recent_transactions.slice(0, 6).map((row) => (
                            <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-white/90">{txLabel(row.type)}</p>
                                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#94A3B8]">{formatTransactionDetailRow(row, t)}</p>
                                </div>
                                <span
                                    className={`shrink-0 tabular-nums font-semibold ${Number.parseFloat(row.amount) < 0 ? 'text-amber-400' : 'text-emerald-400'}`}
                                >
                                    {fmtUsd(row.amount)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </RmsCard>
            ) : null}

            <div className="fixed bottom-2 left-1/2 z-20 w-[min(460px,calc(100vw-20px))] -translate-x-1/2 rounded-[24px] border border-white/10 bg-[#0a1020]/95 p-2 shadow-[0_20px_44px_rgba(0,0,0,0.5)] backdrop-blur-xl md:hidden">
                <div className="grid grid-cols-5 gap-1 text-[10px]">
                    {['Dashboard', 'Team', 'Surveys', 'Wallet', 'More'].map((item) => (
                        <span
                            key={item}
                            className={`flex min-h-[44px] items-center justify-center rounded-xl font-semibold ${
                                item === 'Dashboard'
                                    ? 'bg-gradient-to-r from-[#7C3AED]/45 to-[#2563EB]/30 text-white ring-1 ring-[#A78BFA]/45 shadow-[0_8px_20px_rgba(124,58,237,0.35)]'
                                    : 'text-slate-300'
                            }`}
                        >
                            {item}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

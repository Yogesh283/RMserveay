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
        <div className="relative space-y-6">
            {err ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</p>
            ) : null}

            {loading ? (
                <p className="rounded-xl border border-white/10 bg-[#111827]/80 px-4 py-3 text-sm text-[#A0AEC0]">{t('member.dashboard.loadingFigures')}</p>
            ) : null}

            {user ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6C4CF1]/50 to-[#8E6BFF]/30 ring-2 ring-white/10 shadow-[0_8px_32px_rgba(108,76,241,0.35)] sm:h-14 sm:w-14">
                            <span className="text-base font-bold text-white sm:text-lg">{(user.name || user.email || '?').charAt(0).toUpperCase()}</span>
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0B0F1A] bg-emerald-500 sm:h-3 sm:w-3" />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5 sm:pt-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0AEC0]">{t('member.dashboard.welcomeBack')}</p>
                            <p className="truncate text-base font-semibold text-white sm:text-lg">{user.name || t('member.dashboard.memberFallback')}</p>
                            <p className="truncate text-xs text-[#A0AEC0]">{user.email}</p>
                            {user.login_uid ? (
                                <p className="mt-0.5 truncate font-mono text-[11px] text-[#C4B5FD]">
                                    {t('member.dashboard.userId')}: <span className="font-semibold text-white">{user.login_uid}</span>
                                </p>
                            ) : null}
                        </div>
                    </div>
                    <Link
                        to="/member/profile"
                        className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white transition hover:border-[#8E6BFF]/40 active:scale-[0.98] sm:min-h-0 sm:w-auto sm:self-center"
                    >
                        {t('member.dashboard.profile')}
                    </Link>
                </div>
            ) : null}

            <RmsCard variant="elevated" className="!p-0" padding={false}>
                <div className="space-y-4 p-4 sm:p-5">
                    <div className="min-w-0 space-y-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0AEC0]">
                            {t('member.dashboard.mainWalletTitle')}
                        </p>
                        <p className="text-3xl font-bold tabular-nums tracking-tight text-white sm:text-[2.5rem] sm:leading-none">
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
                    <div className="border-t border-white/[0.08] pt-4">
                        <RmsButtonLink
                            to="/member/active-panels"
                            variant="gold"
                            size="sm"
                            className="w-full !justify-center rounded-xl font-bold tracking-wide !from-[#7c3aed] !via-[#0B9CF5] !to-amber-600 !text-white"
                        >
                            {t('member.dashboard.idActive')}
                        </RmsButtonLink>
                        <p className="mt-2 text-center text-[11px] leading-snug text-[#718096]">{t('member.dashboard.idActiveHint')}</p>
                    </div>
                </div>
            </RmsCard>

            <div>
                <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0AEC0]">{t('member.dashboard.earningsSummary')}</p>
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
        </div>
    );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { prepareSanctum } from '../../lib/auth';
import { formatTransactionDetailRow } from '../lib/formatTransactionDetail';
import { RmsButtonLink, RmsCard } from '../components/rms';

const WEEK_DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function EarningsOverviewCard({ weekly, fmtUsd }) {
    const fallback = useMemo(
        () =>
            WEEK_DAY_ORDER.map((d) => ({
                date: d,
                day_label: d,
                direct: '0.00',
                matching: '0.00',
                level: '0.00',
                survey: '0.00',
                total: '0.00',
            })),
        [],
    );
    const daily = Array.isArray(weekly?.daily) && weekly.daily.length === 7 ? weekly.daily : fallback;
    const total = Number.parseFloat(weekly?.total ?? '0') || 0;
    const direct = Number.parseFloat(weekly?.direct ?? '0') || 0;
    const matching = Number.parseFloat(weekly?.matching ?? '0') || 0;
    const other = Number.parseFloat(weekly?.other ?? '0') || 0;

    const totals = daily.map((d) => Number.parseFloat(d.total) || 0);
    const max = Math.max(1, ...totals);
    const w = 100;
    const h = 40;
    const stepX = w / (totals.length - 1 || 1);
    const points = totals.map((v, i) => {
        const x = i * stepX;
        const y = h - (v / max) * (h - 6) - 3;
        return [x, y];
    });
    const linePath = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
        .join(' ');
    const areaPath = `${linePath} L${(w).toFixed(2)} ${h} L0 ${h} Z`;

    const directPct = total > 0 ? (direct / total) * 100 : 0;
    const matchingPct = total > 0 ? (matching / total) * 100 : 0;
    const otherPct = total > 0 ? (other / total) * 100 : 0;
    const conic = total > 0
        ? `conic-gradient(#8B5CF6 0% ${directPct.toFixed(2)}%, #06B6D4 ${directPct.toFixed(2)}% ${(directPct + matchingPct).toFixed(2)}%, #F59E0B ${(directPct + matchingPct).toFixed(2)}% 100%)`
        : 'conic-gradient(#1f2937 0% 100%)';

    return (
        <RmsCard variant="elevated" className="!rounded-[24px] !border-white/10 !bg-[#0f162b]/95 !p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Earnings Overview</p>
                    <p className="text-[11px] text-slate-400">This Week (Mon–Sun)</p>
                </div>
                <span className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-200">This Week</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#8B5CF6]/30 bg-[#11182b]/90 p-3">
                    <div className="relative h-24 overflow-hidden rounded-xl border border-[#8B5CF6]/20 bg-black/25">
                        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
                            <defs>
                                <linearGradient id="ew-area" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.55" />
                                    <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d={areaPath} fill="url(#ew-area)" />
                            <path d={linePath} stroke="#A78BFA" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            {points.map(([x, y], i) => {
                                const v = totals[i];
                                if (v <= 0) return null;
                                return <circle key={i} cx={x} cy={y} r="1.4" fill="#E9D5FF" />;
                            })}
                        </svg>
                    </div>
                    <div className="mt-1.5 grid grid-cols-7 gap-0.5 text-center text-[8px] text-slate-400">
                        {daily.map((d, i) => (
                            <span
                                key={d.date ?? i}
                                title={`${d.day_label}: ${fmtUsd(d.total)}`}
                                className={`truncate ${totals[i] > 0 ? 'text-violet-200' : ''}`}
                            >
                                {d.day_label?.slice(0, 1)}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="rounded-2xl border border-cyan-400/25 bg-[#11182b]/90 p-3">
                    <div className="relative mx-auto h-24 w-24" aria-hidden>
                        <div className="h-full w-full rounded-full" style={{ background: conic }} />
                        <div className="absolute inset-2 flex items-center justify-center rounded-full bg-[#0f162b] text-center">
                            <div>
                                <p className="text-[9px] text-slate-400">Total</p>
                                <p className="text-xs font-bold text-white">{fmtUsd(total)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-slate-300">
                <span className="inline-flex items-center gap-1">
                    <i className="h-2 w-2 rounded-full bg-[#8B5CF6]" />
                    Direct <span className="ml-auto tabular-nums text-slate-400">{fmtUsd(direct)}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                    <i className="h-2 w-2 rounded-full bg-[#06B6D4]" />
                    Matching <span className="ml-auto tabular-nums text-slate-400">{fmtUsd(matching)}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                    <i className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                    Other <span className="ml-auto tabular-nums text-slate-400">{fmtUsd(other)}</span>
                </span>
            </div>
        </RmsCard>
    );
}

export default function MemberDashboardPage() {
    const { t, i18n } = useTranslation();
    const [user, setUser] = useState(null);
    const [summary, setSummary] = useState(null);
    const [overview, setOverview] = useState(null);
    const [teamOverview, setTeamOverview] = useState(null);
    const [levelIncome, setLevelIncome] = useState(null);
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

            // Optional extras for the UI tiles. If these fail, dashboard should still render.
            const [team, li] = await Promise.allSettled([
                window.axios.get('api/member/team/overview'),
                window.axios.get('api/member/programme/level-income'),
            ]);
            setTeamOverview(team.status === 'fulfilled' ? team.value.data : null);
            setLevelIncome(li.status === 'fulfilled' ? li.value.data : null);
        } catch (e) {
            setErr(e.response?.data?.message ?? e.message ?? t('member.dashboard.loadFailed'));
            setTeamOverview(null);
            setLevelIncome(null);
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

    const directReferralsCount = teamOverview?.direct?.count ?? 0;
    const activePanelsCount = Number(
        q?.active_panels_count ??
            ((q?.sub_panel_count ?? user?.sub_panel_count ?? 0) + (q?.super_sub_panel_count ?? user?.super_sub_panel_count ?? 0)),
    );
    const surveysCompletedCount = q?.completed_surveys_count ?? 0;
    const todayEarnings = summary?.today_earnings_usd ?? null;
    /** Backwards-compat: if backend doesn't ship `today_earnings_usd` yet, fall back to level-only. */
    const todayEarningsUsd = todayEarnings?.total ?? levelIncome?.earned_today_usd ?? 0;
    const totalEarningsUsd = e?.total_from_programme ?? 0;
    /** Mirrored from `wallet` / `users` (main = spend/withdraw; P2P = internal pool). */
    const mainWalletUsd = overview?.wallet_balance ?? summary?.wallet_main_usd ?? user?.wallet_balance;
    const p2pWalletUsd = overview?.p2p_wallet_balance ?? summary?.wallet_p2p_usd ?? user?.p2p_wallet_balance;
    const surveyWalletUsd = overview?.survey_wallet_balance ?? summary?.wallet_survey_usd ?? user?.survey_wallet_balance;

    const panelStatus = summary?.panel_status ?? null;
    const nextActionKey = panelStatus?.next_action_key ?? null;
    /** Activation progress = how many of the 4 programme panels the member is currently running. */
    const activationProgressPct = panelStatus
        ? Math.round((panelStatus.running_count / Math.max(1, panelStatus.panels.length)) * 100)
        : 0;

    function panelAccent(panel) {
        if (panel.key === 'activation') return 'violet';
        if (panel.key === 'minimum_panel') return 'cyan';
        if (panel.key === 'sub_panel') return 'sky';
        return 'amber';
    }

    function panelStateLabel(panel) {
        if (panel.key === 'activation' || panel.key === 'minimum_panel') {
            return panel.running ? 'Paid' : 'Pending';
        }
        if (panel.completed) return 'Maxed';
        if (panel.running) return 'Running';
        return 'Not started';
    }

    const earningCards = useMemo(() => {
        if (!summary || !e) return [];
        return [
            {
                label: t('member.dashboard.earnTotal'),
                value: fmtUsd(e.total_from_programme),
                to: '/member/transactions',
            },
            {
                label: t('member.dashboard.earnDirect'),
                value: fmtUsd(e.direct_income),
                to: '/member/transactions',
                hint: t('member.dashboard.earnDirectHint'),
            },
            {
                label: t('member.dashboard.earnLevel'),
                value: fmtUsd(e.level_income),
                to: '/member/transactions',
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
        const labelMap = {
            active_panel_matching: 'Active Panel Matching',
            panel_matching: 'Sub Panel Matching',
            sub_panel_matching: 'Sub Panel Matching',
            super_sub_panel_matching: 'Super Panel Matching',
            sub_panel_fee: 'Sub Panel Fee',
            super_sub_panel_fee: 'Super Panel Fee',
            active_panel_fee: 'Active Panel Fee',
        };
        if (labelMap[type]) return labelMap[type];

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
            <div className="relative overflow-hidden rounded-[16px] border border-[#8B5CF6]/30 bg-gradient-to-r from-[#1a1030] via-[#0d1428] to-[#1b130a] p-2.5 shadow-[0_12px_24px_rgba(76,29,149,0.22)]">
                <div className="pointer-events-none absolute -right-7 -top-8 h-24 w-24 rounded-full bg-[#7C3AED]/25 blur-2xl" />
                <div className="pointer-events-none absolute -left-6 bottom-0 h-12 w-12 rounded-full bg-cyan-400/15 blur-2xl" />
                <div className="relative">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2">
                            <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-300/55 bg-violet-500/20 text-sm font-bold text-white shadow-[0_0_18px_rgba(124,58,237,0.4)]">
                                {(user?.name || 'Y').charAt(0).toUpperCase()}
                                <span className="absolute -right-0.5 top-0.5 h-2 w-2 rounded-full border border-[#0B1120] bg-emerald-400" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-[10px] text-slate-300">{t('member.dashboard.welcomeBack')}</p>
                                <p className="truncate text-sm font-semibold leading-tight text-white">{user?.name || 'yogesh'}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex min-h-[18px] items-center rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-200">
                                        ID: {(user?.login_uid || '—').toString().toUpperCase()}
                                    </span>
                                    <span className="inline-flex min-h-[18px] items-center gap-1 rounded-full border border-cyan-300/30 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-100">
                                        Active Panels: {activePanelsCount}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-300/35 bg-violet-500/10 text-violet-100 shadow-[0_0_18px_rgba(124,58,237,0.22)]">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12.5l1.8 1.8 3.2-3.2" />
                            </svg>
                        </span>
                    </div>

                    <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                        <div className="flex items-center gap-2.5">
                            <div className="relative h-9 w-9 shrink-0 rounded-full border border-violet-300/40 bg-[#0b1020]">
                                <div className="absolute inset-[4px] rounded-full border border-violet-300/45" />
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-violet-200">{activationProgressPct}%</div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-white">
                                    {panelStatus
                                        ? panelStatus.running_count > 0
                                            ? `${panelStatus.running_count} panel${panelStatus.running_count === 1 ? '' : 's'} running`
                                            : 'Complete your ID Activation'
                                        : 'Complete your ID Activation'}
                                </p>
                                <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-300">
                                    {nextActionKey
                                        ? `Next: ${(panelStatus.panels.find((p) => p.key === nextActionKey)?.label) ?? 'Activate'}`
                                        : 'Unlock full rewards, referrals and matching income flow.'}
                                </p>
                            </div>
                            <Link
                                to={
                                    nextActionKey
                                        ? panelStatus.panels.find((p) => p.key === nextActionKey)?.cta_to ?? '/member/active-panels'
                                        : '/member/active-panels'
                                }
                                className="shrink-0 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#F59E0B] px-2 py-1.5 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(124,58,237,0.34)]"
                            >
                                {nextActionKey ? 'Buy →' : 'Activate →'}
                            </Link>
                        </div>
                        <div className="mt-2 grid grid-cols-4 gap-1.5">
                            {(panelStatus?.panels ?? []).map((p) => {
                                const accent = panelAccent(p);
                                const isNext = p.key === nextActionKey;
                                const accentRing = {
                                    violet: 'border-[#7C3AED]/55 bg-gradient-to-br from-[#7C3AED]/30 to-[#2563EB]/10 shadow-[0_0_14px_rgba(124,58,237,0.45)]',
                                    cyan: 'border-cyan-400/55 bg-gradient-to-br from-cyan-500/25 to-[#3B82F6]/10 shadow-[0_0_14px_rgba(34,211,238,0.45)]',
                                    sky: 'border-sky-400/55 bg-gradient-to-br from-sky-500/25 to-[#1D4ED8]/10 shadow-[0_0_14px_rgba(56,189,248,0.45)]',
                                    amber: 'border-amber-400/55 bg-gradient-to-br from-amber-500/30 to-[#F97316]/10 shadow-[0_0_14px_rgba(245,158,11,0.45)]',
                                };
                                const cardCls = p.running
                                    ? accentRing[accent]
                                    : isNext
                                    ? 'border-amber-400/40 bg-amber-500/10 animate-pulse'
                                    : 'border-white/10 bg-white/[0.03]';
                                const labelColor = p.running
                                    ? 'text-white'
                                    : isNext
                                    ? 'text-amber-100'
                                    : 'text-slate-400';
                                return (
                                    <Link
                                        key={p.key}
                                        to={p.cta_to}
                                        className={`relative flex flex-col items-center justify-center rounded-lg border px-1 py-1.5 transition active:scale-[0.97] ${cardCls}`}
                                        title={`${p.label} · ${panelStateLabel(p)}`}
                                    >
                                        {p.running ? (
                                            <span className="absolute -right-0.5 -top-0.5 inline-flex h-2 w-2 items-center justify-center">
                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                                            </span>
                                        ) : null}
                                        <p className={`text-[8px] font-bold leading-tight tabular-nums ${labelColor}`}>
                                            {p.max > 1 ? `${p.count}/${p.max}` : p.running ? '✓' : '—'}
                                        </p>
                                        <p className={`mt-0.5 truncate text-[8.5px] leading-tight ${p.running ? 'text-white/85' : isNext ? 'text-amber-200/85' : 'text-slate-400'}`}>
                                            {p.label.replace(' Panels', '').replace(' Panel', '')}
                                        </p>
                                    </Link>
                                );
                            })}
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
                <div className="space-y-3 p-3 sm:p-3.5">
                    <div className="min-w-0 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0AEC0]">Total Balance</p>
                            <button type="button" className="rounded-lg border border-white/10 bg-white/[0.04] p-1 text-slate-300">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-3xl font-bold tabular-nums tracking-tight text-white sm:text-[2.1rem] sm:leading-none">
                            {mainWalletUsd != null && mainWalletUsd !== '' ? fmtUsd(mainWalletUsd) : '—'}
                        </p>
                        <RmsCard variant="inset" className="!p-0" padding={false}>
                            <div className="grid gap-2.5 p-2.5 sm:grid-cols-2 sm:p-3">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-200/90">Survey wallet</p>
                                    <p className="mt-0.5 text-lg font-bold tabular-nums text-white sm:text-xl">
                                        {surveyWalletUsd != null && surveyWalletUsd !== '' ? fmtUsd(surveyWalletUsd) : '—'}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-end justify-between gap-2.5">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0AEC0]">
                                            {t('member.dashboard.p2pWalletTitle')}
                                        </p>
                                        <p className="mt-0.5 text-lg font-bold tabular-nums text-white sm:text-xl">
                                            {p2pWalletUsd != null && p2pWalletUsd !== '' ? fmtUsd(p2pWalletUsd) : '—'}
                                        </p>
                                    </div>
                                    <Link
                                        to="/member/wallet/internal"
                                        className="shrink-0 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#C4B5FD] transition hover:border-[#8E6BFF]/40 hover:bg-white/[0.1] hover:text-white active:scale-[0.98]"
                                    >
                                        Main ↔ P2P
                                    </Link>
                                </div>
                            </div>
                        </RmsCard>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            <RmsButtonLink
                                to="/member/wallet/deposit"
                                variant="neon"
                                size="sm"
                                className="!w-auto flex-1 min-w-[130px] rounded-xl !py-2"
                            >
                                {t('member.dashboard.deposit')}
                            </RmsButtonLink>
                            <RmsButtonLink
                                to="/member/wallet/withdraw"
                                variant="ghost"
                                size="sm"
                                className="!w-auto flex-1 min-w-[110px] rounded-xl border-white/15 bg-white/[0.06] hover:border-[#8E6BFF]/40 hover:bg-white/[0.1] !py-2"
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

            <EarningsOverviewCard weekly={summary?.weekly_earnings_usd} fmtUsd={fmtUsd} />


            <div>
                <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0AEC0]">Stats Summary</p>
                    <Link to="/member/transactions" className="text-xs font-semibold text-[#8E6BFF] hover:underline">
                        {t('member.dashboard.allTransactions')}
                    </Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {/* Direct Referrals */}
                    <RmsCard variant="inset" className="!p-3 !rounded-[22px] !border-[#7C3AED]/25 !bg-[#0f162b]/90" padding={false}>
                        <div className="flex items-start gap-2">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#7C3AED]/40 bg-gradient-to-br from-[#7C3AED]/25 to-[#2563EB]/10 shadow-[0_0_26px_rgba(124,58,237,0.25)]">
                                <svg className="h-5 w-5 text-[#DDD6FE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.5 11a4 4 0 100-8 4 4 0 000 8z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 8v6" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M23 11h-6" />
                                </svg>
                            </span>
                            <div className="min-w-0">
                                <p className="text-[9px] font-medium uppercase tracking-wide text-[#A0AEC0]">Direct Referrals</p>
                                <p className="mt-1 text-sm font-bold tabular-nums text-white">{directReferralsCount}</p>
                                <p className="mt-0.5 text-[9px] text-[#A0AEC0]/90">Total direct members</p>
                            </div>
                        </div>
                    </RmsCard>

                    {/* Surveys Completed */}
                    <RmsCard variant="inset" className="!p-3 !rounded-[22px] !border-[#06B6D4]/25 !bg-[#0f162b]/90" padding={false}>
                        <div className="flex items-start gap-2">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#06B6D4]/35 bg-gradient-to-br from-[#06B6D4]/20 to-[#3B82F6]/10 shadow-[0_0_26px_rgba(6,182,212,0.18)]">
                                <svg className="h-5 w-5 text-[#A5F3FC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 14l2-2 4 4" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5h18v14H3z" />
                                </svg>
                            </span>
                            <div className="min-w-0">
                                <p className="text-[9px] font-medium uppercase tracking-wide text-[#A0AEC0]">Surveys Completed</p>
                                <p className="mt-1 text-sm font-bold tabular-nums text-white">{surveysCompletedCount}</p>
                                <p className="mt-0.5 text-[9px] text-[#A0AEC0]/90">Completed surveys</p>
                            </div>
                        </div>
                    </RmsCard>

                    {/* Active Panels */}
                    <RmsCard variant="inset" className="!p-3 !rounded-[22px] !border-[#38BDF8]/25 !bg-[#0f162b]/90" padding={false}>
                        <div className="flex items-start gap-2">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#38BDF8]/35 bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/10 shadow-[0_0_26px_rgba(56,189,248,0.2)]">
                                <svg className="h-5 w-5 text-cyan-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5.5A1.5 1.5 0 015.5 4h13A1.5 1.5 0 0120 5.5v13a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 18.5v-13z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 8h8M8 12h8M8 16h5" />
                                </svg>
                            </span>
                            <div className="min-w-0">
                                <p className="text-[9px] font-medium uppercase tracking-wide text-[#A0AEC0]">Active Panels</p>
                                <p className="mt-1 text-sm font-bold tabular-nums text-white">{activePanelsCount}</p>
                                <p className="mt-0.5 text-[9px] text-[#A0AEC0]/90">Sub + super panels active</p>
                            </div>
                        </div>
                    </RmsCard>

                    {/* Today’s Earnings */}
                    <RmsCard variant="inset" className="!p-3 !rounded-[22px] !border-emerald-400/20 !bg-[#0f162b]/90" padding={false}>
                        <div className="flex items-start gap-2">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/35 bg-gradient-to-br from-emerald-500/20 to-[#06B6D4]/10 shadow-[0_0_26px_rgba(16,185,129,0.18)]">
                                <svg className="h-5 w-5 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 1v22" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 5H9.5a3.5 3.5 0 000 7H14a3.5 3.5 0 010 7H7" />
                                </svg>
                            </span>
                            <div className="min-w-0">
                                <p className="text-[9px] font-medium uppercase tracking-wide text-[#A0AEC0]">Today's Earnings</p>
                                <p className="mt-1 text-sm font-bold tabular-nums text-white">{fmtUsd(todayEarningsUsd)}</p>
                                <p className="mt-0.5 text-[9px] text-[#A0AEC0]/90">Direct + Level + Survey + Matching</p>
                            </div>
                        </div>
                    </RmsCard>

                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <RmsCard variant="inset" className="!p-3 !rounded-[22px] !border-emerald-400/20 !bg-[#0f162b]/90" padding={false}>
                    <div className="flex items-start gap-2">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/35 bg-gradient-to-br from-emerald-500/20 to-[#06B6D4]/10 shadow-[0_0_26px_rgba(16,185,129,0.18)]">
                            <svg className="h-5 w-5 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-2.5 0-4.5 1.7-4.5 3.8S9.5 15.6 12 15.6s4.5-1.7 4.5-3.8S14.5 8 12 8z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.8v2.1M12 16.9V19m6-7.2h-2.1M8.1 11.8H6m9.9-4.8l-1.5 1.5M9.6 15.4 8.1 17m0-10 1.5 1.5m4.8 6.9 1.5 1.5" />
                            </svg>
                        </span>
                        <div className="min-w-0">
                            <p className="text-[9px] font-medium uppercase tracking-wide text-[#A0AEC0]">{t('member.dashboard.surveyCredits')}</p>
                            <p className="mt-1 text-sm font-bold tabular-nums text-white">{e ? fmtUsd(e.survey_credits) : '—'}</p>
                            <p className="mt-0.5 text-[9px] text-[#A0AEC0]/90">{t('member.dashboard.payouts', { count: q?.survey_credits_count ?? 0 })}</p>
                        </div>
                    </div>
                </RmsCard>
                <Link to="/member/surveys">
                    <RmsCard
                        variant="inset"
                        className="!p-3 !rounded-[22px] !border-[#8E6BFF]/25 !bg-[#0f162b]/90 transition hover:ring-1 hover:ring-[#8E6BFF]/30 active:scale-[0.99]"
                        padding={false}
                    >
                        <div className="flex items-start gap-2">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#8E6BFF]/35 bg-gradient-to-br from-[#8E6BFF]/25 to-[#2563EB]/10 shadow-[0_0_26px_rgba(142,107,255,0.24)]">
                                <svg className="h-5 w-5 text-violet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5h6M7 9h10M7 13h10M7 17h6" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m16 17 2 2 4-4" />
                                </svg>
                            </span>
                            <div className="min-w-0">
                                <p className="text-[9px] font-medium uppercase tracking-wide text-[#A0AEC0]">{t('member.dashboard.availableSurveys')}</p>
                                <p className="mt-1 text-sm font-bold tabular-nums text-white">{q?.available_surveys_count ?? '—'}</p>
                                <p className="mt-0.5 text-[9px] text-[#A0AEC0]/90">{surveySubtext}</p>
                            </div>
                        </div>
                    </RmsCard>
                </Link>
            </div>

            <div>
                <p className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0AEC0]">Income Totals</p>
                <div className="grid grid-cols-3 gap-2">
                    <Link to="/member/transactions?type=direct_commission" className="block">
                        <RmsCard
                            variant="inset"
                            className="!p-3 !rounded-[20px] !border-[#7C3AED]/35 !bg-gradient-to-br !from-[#1a1030]/95 !to-[#0f162b]/95 shadow-[0_0_22px_rgba(124,58,237,0.22)] transition active:scale-[0.99]"
                            padding={false}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[#7C3AED]/45 bg-[#7C3AED]/20 text-[#C4B5FD]">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 11a4 4 0 100-8 4 4 0 000 8z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 8v6M23 11h-6" />
                                    </svg>
                                </span>
                                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#C4B5FD]">Direct</p>
                            </div>
                            <p className="mt-2 text-base font-bold tabular-nums text-white sm:text-lg">{fmtUsd(e?.direct_income ?? 0)}</p>
                            <p className="mt-0.5 text-[9px] text-slate-400">Lifetime total</p>
                        </RmsCard>
                    </Link>
                    <Link to="/member/transactions?type=survey_level_income" className="block">
                        <RmsCard
                            variant="inset"
                            className="!p-3 !rounded-[20px] !border-cyan-400/35 !bg-gradient-to-br !from-[#062131]/95 !to-[#0f162b]/95 shadow-[0_0_22px_rgba(34,211,238,0.18)] transition active:scale-[0.99]"
                            padding={false}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-cyan-400/45 bg-cyan-500/15 text-cyan-200">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3-9 4 18 3-9h4" />
                                    </svg>
                                </span>
                                <p className="text-[9px] font-semibold uppercase tracking-wider text-cyan-200">Level</p>
                            </div>
                            <p className="mt-2 text-base font-bold tabular-nums text-white sm:text-lg">{fmtUsd(e?.level_income ?? 0)}</p>
                            <p className="mt-0.5 text-[9px] text-slate-400">Lifetime total</p>
                        </RmsCard>
                    </Link>
                    <Link to="/member/transactions?types=active_panel_matching,panel_matching,sub_panel_matching,super_sub_panel_matching" className="block">
                        <RmsCard
                            variant="inset"
                            className="!p-3 !rounded-[20px] !border-amber-400/35 !bg-gradient-to-br !from-[#2b1c08]/95 !to-[#0f162b]/95 shadow-[0_0_22px_rgba(245,158,11,0.22)] transition active:scale-[0.99]"
                            padding={false}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-amber-400/45 bg-amber-500/15 text-amber-200">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A1.5 1.5 0 015.5 4h13A1.5 1.5 0 0120 5.5v13a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 18.5v-13z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h8M8 12h8M8 16h5" />
                                    </svg>
                                </span>
                                <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-200">Matching</p>
                            </div>
                            <p className="mt-2 text-base font-bold tabular-nums text-white sm:text-lg">{fmtUsd(e?.matching_income ?? 0)}</p>
                            <p className="mt-0.5 text-[9px] text-slate-400">Active + sub + super</p>
                        </RmsCard>
                    </Link>
                </div>
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

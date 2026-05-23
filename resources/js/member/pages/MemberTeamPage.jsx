import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { prepareSanctum } from '../../lib/auth';
import { MatchingIncomeTable } from '../components/MatchingIncomeTable';
import { RmsCard } from '../components/rms';
import { APP_LOGO_URL, APP_NAME_FALLBACK } from '../../lib/branding';
function fmtUsd(s, lang) {
    const n = Number.parseFloat(s);
    if (Number.isNaN(n)) return s ?? '—';
    try {
        return new Intl.NumberFormat(lang || 'en', { style: 'currency', currency: 'USD' }).format(n);
    } catch {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
    }
}

async function copyTextToClipboard(text) {
    if (!text) {
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        /* ignore */
    }
}

function BinaryReferralLegRow({ title, url, tone = 'emerald', status = 'Primary' }) {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await copyTextToClipboard(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        const shareTitle = t('member.team.shareInviteTitle', { leg: title });
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            try {
                let files;
                try {
                    const res = await fetch(APP_LOGO_URL, { cache: 'force-cache' });
                    if (res.ok) {
                        const blob = await res.blob();
                        const file = new File([blob], 'rm-survey-logo.png', {
                            type: blob.type || 'image/png',
                        });
                        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
                            files = [file];
                        }
                    }
                } catch {
                    /* logo fetch failed — share text+url only */
                }
                const payload = files
                    ? { title: shareTitle, text: `${shareTitle} — ${APP_NAME_FALLBACK}`, url, files }
                    : { title: shareTitle, text: `${shareTitle} — ${APP_NAME_FALLBACK}`, url };
                await navigator.share(payload);
                return;
            } catch (e) {
                if (e?.name === 'AbortError') {
                    return;
                }
            }
        }
        await handleCopy();
    };

    const isEmerald = tone === 'emerald';
    const frame = isEmerald
        ? 'border-emerald-400/35 bg-gradient-to-br from-emerald-950/35 via-[#0b1322] to-[#0b1020] shadow-[0_0_28px_rgba(16,185,129,0.12)]'
        : 'border-violet-400/35 bg-gradient-to-br from-violet-950/35 via-[#0b1322] to-[#0b1020] shadow-[0_0_28px_rgba(139,92,246,0.14)]';
    const titleTone = isEmerald ? 'text-emerald-200' : 'text-violet-200';
    const statusTone = isEmerald
        ? 'border-emerald-300/35 bg-emerald-500/15 text-emerald-200'
        : 'border-violet-300/35 bg-violet-500/15 text-violet-200';
    const shareBtn = isEmerald
        ? 'border-emerald-300/30 bg-gradient-to-r from-emerald-500/85 to-teal-500/85 text-white shadow-[0_8px_20px_rgba(16,185,129,0.28)]'
        : 'border-violet-300/30 bg-gradient-to-r from-violet-600/90 to-fuchsia-500/85 text-white shadow-[0_8px_20px_rgba(139,92,246,0.28)]';

    return (
        <div className={`relative overflow-hidden rounded-lg border p-2.5 ${frame}`}>
            <div className="pointer-events-none absolute -right-5 top-1 h-12 w-12 rounded-full bg-white/5 blur-2xl" />
            <div className="relative">
                <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${isEmerald ? 'border-emerald-300/40 bg-emerald-500/15 text-emerald-200' : 'border-violet-300/40 bg-violet-500/15 text-violet-200'}`}>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14a3 3 0 010-4.243l2-2a3 3 0 114.243 4.243l-1 1M14 10a3 3 0 010 4.243l-2 2a3 3 0 11-4.243-4.243l1-1" />
                            </svg>
                        </span>
                        <div>
                            <p className={`text-[11px] font-bold uppercase tracking-[0.06em] ${titleTone}`}>{title}</p>
                            <span className={`mt-0.5 inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${statusTone}`}>● {status}</span>
                        </div>
                    </div>
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md border ${isEmerald ? 'border-emerald-300/30 bg-emerald-500/10 text-emerald-200' : 'border-violet-300/30 bg-violet-500/10 text-violet-200'}`}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
                        </svg>
                    </span>
                </div>

                <div className="relative mt-1.5 rounded-md border border-white/10 bg-black/25 px-2 py-1.5">
                    <p className="break-all pr-7 font-mono text-[10px] leading-snug text-white/90">{url || t('member.ui.dash')}</p>
                    <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!url}
                        className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-md border border-white/15 bg-white/[0.06] text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                        title={t('member.ui.copy')}
                    >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16h8a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 8H5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-1" />
                        </svg>
                    </button>
                </div>

                <div className="mt-1.5 grid grid-cols-2 gap-1">
                    <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!url}
                        className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-1 text-[10px] font-semibold text-white transition hover:border-violet-300/35 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {copied ? t('member.ui.copied') : t('member.ui.copy')}
                    </button>
                    <button
                        type="button"
                        onClick={handleShare}
                        disabled={!url}
                        className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${shareBtn}`}
                    >
                        {t('member.ui.share')}
                    </button>
                </div>
            </div>
        </div>
    );
}

const STAT_TONES = {
    neutral: {
        card: 'border-white/[0.08] bg-[#111827]/80',
        label: 'text-[#A0AEC0]',
        hint: 'text-[#A0AEC0]',
    },
    active: {
        card: 'border-emerald-500/40 bg-emerald-950/30 ring-1 ring-emerald-500/15',
        label: 'text-emerald-300/95',
        hint: 'text-emerald-200/70',
    },
    sub: {
        card: 'border-sky-500/40 bg-sky-950/25 ring-1 ring-sky-500/15',
        label: 'text-sky-300/95',
        hint: 'text-sky-200/70',
    },
    super: {
        card: 'border-amber-500/40 bg-amber-950/30 ring-1 ring-amber-500/15',
        label: 'text-amber-300/95',
        hint: 'text-amber-200/70',
    },
};

function StatCard({ label, value, hint, tone = 'neutral' }) {
    const tc = STAT_TONES[tone] ?? STAT_TONES.neutral;
    return (
        <div className={`rounded-lg border px-2.5 py-2 ${tc.card}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${tc.label}`}>{label}</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-white">{value}</p>
            {hint ? <p className={`mt-0.5 text-[11px] leading-tight ${tc.hint}`}>{hint}</p> : null}
        </div>
    );
}

/** Premium chip used for every binary-tree node. Clicking re-roots the tree on this user. */
function NodeChip({ node, onClick, isLoading = false, hasChildren = false, isRoot = false }) {
    const { t } = useTranslation();
    const superN = node.super_sub_panel_count > 0;
    const subOnly = !superN && node.sub_panel_count > 0;
    const isActive = Boolean(node.is_active) && !superN && !subOnly;

    /**
     * Tier-coloured chip. Priority: Super (gold) > Sub (light blue) > Active (full green) > default.
     * Each tier uses a strong gradient so the colour is unmistakable on small chips.
     */
    const tierGradient = superN
        ? 'border-amber-300/75 bg-gradient-to-br from-yellow-300/55 via-amber-400/45 to-yellow-600/55 text-amber-50 shadow-[0_8px_22px_rgba(234,179,8,0.35)]'
        : subOnly
          ? 'border-sky-300/65 bg-gradient-to-br from-sky-300/55 via-cyan-300/40 to-sky-400/55 text-sky-50 shadow-[0_8px_22px_rgba(56,189,248,0.3)]'
          : isActive
            ? 'border-emerald-300/75 bg-gradient-to-br from-emerald-400/65 via-emerald-500/55 to-emerald-700/65 text-emerald-50 shadow-[0_8px_22px_rgba(16,185,129,0.35)]'
            : 'border-white/20 bg-gradient-to-br from-slate-700/70 via-slate-800/60 to-slate-900/70 text-slate-100';

    const ring = node.is_active && !superN && !subOnly ? 'ring-2 ring-emerald-300/70' : '';
    const rootBadge = isRoot ? 'ring-2 ring-cyan-300/80 shadow-[0_0_22px_rgba(34,211,238,0.45)]' : '';

    const interactive = typeof onClick === 'function';
    const cursorCls = interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97]' : 'cursor-default';

    const Wrapper = interactive ? 'button' : 'div';
    const wrapperProps = interactive
        ? {
              type: 'button',
              onClick,
              'aria-label': `View tree from ${node.login_uid || node.name}`,
          }
        : {};

    return (
        <Wrapper
            {...wrapperProps}
            className={`relative flex h-[100px] w-[100px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border-2 px-2 py-1.5 text-center ring-offset-2 ring-offset-[#0b0f1a] backdrop-blur-sm transition-all duration-200 sm:h-[132px] sm:w-[132px] sm:gap-1 sm:px-3 sm:py-2 ${tierGradient} ${ring} ${rootBadge} ${cursorCls}`}
        >
            {/** Subtle inner highlight for premium look */}
            <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.18] via-transparent to-black/[0.22]" aria-hidden />
            <p className="relative max-w-[94%] truncate text-[12px] font-extrabold uppercase leading-none tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)] sm:text-[15px]">
                {(node.login_uid || node.name || t('member.ui.dash')).toString().toUpperCase()}
            </p>
            <div className="relative flex max-w-full flex-wrap justify-center gap-0.5">
                {superN ? (
                    <span className="rounded-full bg-amber-100/25 px-1 py-px text-[8px] font-bold uppercase leading-none text-amber-50 sm:px-1.5 sm:py-0.5 sm:text-[10px]">
                        {t('member.ui.super')}
                    </span>
                ) : subOnly ? (
                    <span className="rounded-full bg-cyan-100/25 px-1 py-px text-[8px] font-bold uppercase leading-none text-sky-50 sm:px-1.5 sm:py-0.5 sm:text-[10px]">
                        {t('member.ui.sub')}
                    </span>
                ) : node.is_active ? (
                    <span className="rounded-full bg-emerald-100/25 px-1 py-px text-[8px] font-bold uppercase leading-none text-emerald-50 sm:px-1.5 sm:py-0.5 sm:text-[10px]">
                        {t('member.ui.active')}
                    </span>
                ) : (
                    <span className="rounded-full bg-white/10 px-1 py-px text-[8px] uppercase leading-none text-white/70 sm:px-1.5 sm:py-0.5 sm:text-[10px]">
                        {t('member.ui.inactive')}
                    </span>
                )}
            </div>
            <p className="relative max-w-[94%] truncate text-[9px] leading-none text-white/75 sm:text-[11px] sm:leading-tight">
                {t('member.team.nodeSubSuper', { sub: node.sub_panel_count, super: node.super_sub_panel_count })}
            </p>
            {hasChildren ? (
                <span
                    className="absolute -bottom-1.5 right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/40 bg-slate-900/80 text-[12px] font-bold leading-none text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)] sm:-bottom-2 sm:right-2 sm:h-7 sm:w-7 sm:text-[14px]"
                    aria-hidden
                >
                    {isLoading ? (
                        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M12 3a9 9 0 11-9 9" strokeLinecap="round" />
                        </svg>
                    ) : (
                        '›'
                    )}
                </span>
            ) : null}
        </Wrapper>
    );
}

/** Left vs right binary legs — same layout; `accent` tints table for Active / Sub / Super tabs. */
const LEGS_TABLE_ACCENTS = {
    default: {
        wrap: 'border-white/[0.12] ring-1 ring-white/[0.06]',
        cap: 'border-white/[0.08] bg-black/20 text-[#A0AEC0]',
        lTh: 'border-white/[0.08] bg-sky-500/15 text-sky-100',
        lSub: 'text-sky-200/80',
        rTh: 'border-white/[0.08] bg-violet-500/15 text-violet-100',
        rSub: 'text-violet-200/80',
        lTd: 'border-white/[0.06] bg-sky-500/[0.07]',
        rTd: 'border-white/[0.06] bg-violet-500/[0.07]',
    },
    active: {
        wrap: 'border-emerald-500/35 ring-1 ring-emerald-500/18',
        cap: 'border-emerald-500/25 bg-emerald-950/45 text-emerald-200/95',
        lTh: 'border-emerald-500/20 bg-emerald-500/18 text-emerald-100',
        lSub: 'text-emerald-200/85',
        rTh: 'border-violet-500/20 bg-violet-500/18 text-violet-100',
        rSub: 'text-violet-200/85',
        lTd: 'border-emerald-500/12 bg-emerald-500/[0.1]',
        rTd: 'border-violet-500/12 bg-violet-500/[0.1]',
    },
    sub: {
        wrap: 'border-sky-500/40 ring-1 ring-sky-500/18',
        cap: 'border-sky-500/25 bg-sky-950/45 text-sky-200/95',
        lTh: 'border-cyan-500/20 bg-cyan-500/17 text-cyan-100',
        lSub: 'text-cyan-200/85',
        rTh: 'border-blue-500/20 bg-blue-500/17 text-blue-100',
        rSub: 'text-blue-200/85',
        lTd: 'border-cyan-500/12 bg-cyan-500/[0.09]',
        rTd: 'border-blue-500/12 bg-blue-500/[0.09]',
    },
    super: {
        wrap: 'border-amber-500/40 ring-1 ring-amber-500/18',
        cap: 'border-amber-500/25 bg-amber-950/45 text-amber-200/95',
        lTh: 'border-amber-500/20 bg-amber-500/18 text-amber-100',
        lSub: 'text-amber-200/85',
        rTh: 'border-orange-500/20 bg-orange-500/17 text-orange-100',
        rSub: 'text-orange-200/85',
        lTd: 'border-amber-500/12 bg-amber-500/[0.1]',
        rTd: 'border-orange-500/12 bg-orange-500/[0.09]',
    },
};

function LegsCompareTable({ rows, caption, accent = 'default' }) {
    const { t } = useTranslation();
    if (!rows?.length) {
        return null;
    }
    const s = LEGS_TABLE_ACCENTS[accent] ?? LEGS_TABLE_ACCENTS.default;
    return (
        <div className={`mt-2 overflow-x-auto rounded-xl border ${s.wrap}`}>
            {caption ? (
                <p className={`border-b px-3 py-1.5 text-[11px] font-medium leading-snug sm:px-4 ${s.cap}`}>{caption}</p>
            ) : null}
            <table className="w-full min-w-[300px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-white/[0.1]">
                        <th className="bg-[#0f172a]/95 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90 sm:px-4">
                            {t('member.ui.details')}
                        </th>
                        <th
                            className={`border-l px-3 py-2 text-right text-[11px] font-bold sm:px-4 sm:text-[12px] ${s.lTh}`}
                            title={t('member.team.legsTableLeftTitle')}
                        >
                            {t('member.team.leftLeg')}
                        </th>
                        <th
                            className={`border-l px-3 py-2 text-right text-[11px] font-bold sm:px-4 sm:text-[12px] ${s.rTh}`}
                            title={t('member.team.legsTableRightTitle')}
                        >
                            {t('member.team.rightLeg')}
                        </th>
                    </tr>
                </thead>
                <tbody className="text-white">
                    {rows.map((row, idx) => (
                        <tr
                            key={idx}
                            className={`border-t border-white/[0.07] ${row.highlight ? 'bg-white/[0.06]' : ''}`}
                        >
                            <td
                                className={`px-3 py-2 text-left text-[12px] font-medium sm:px-4 sm:text-sm ${
                                    row.highlight ? 'bg-white/[0.04] text-amber-100' : 'bg-black/20 text-white/90'
                                }`}
                            >
                                {row.label}
                            </td>
                            <td className={`border-l px-3 py-2 text-right text-sm font-semibold tabular-nums text-white sm:px-4 sm:text-base ${s.lTd}`}>
                                {row.left ?? t('member.ui.dash')}
                            </td>
                            <td className={`border-l px-3 py-2 text-right text-sm font-semibold tabular-nums text-white sm:px-4 sm:text-base ${s.rTd}`}>
                                {row.right ?? t('member.ui.dash')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function fmtUsdShort(s) {
    const n = Number.parseFloat(String(s));
    if (Number.isNaN(n)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function closingScopeLabel(t, scope) {
    if (scope === 'active_panel') return t('member.team.scopeActivePanel');
    if (scope === 'super') return t('member.team.scopeSuperPanel');
    return t('member.team.scopeSubPanel');
}

const CARRY_DASH = '—';

function matchingIncomeRow(t, legMatch) {
    const m = legMatch ?? {};
    const eligible = m.income_eligible === true;
    const useToday = m.today_closing_recorded === true;
    const amount = eligible
        ? useToday
            ? (m.today_payout_usd ?? '0.00')
            : (m.payout_usd ?? '0.00')
        : '0.00';
    const date = useToday ? m.today_date : m.team_volume_date;
    return {
        label: eligible
            ? useToday
                ? t('member.team.rowMatchingIncomeToday', { date })
                : t('member.team.rowMatchingIncome', { date })
            : t('member.team.rowMatchingIncomeBlocked'),
        left: fmtUsdShort(amount),
        right: fmtUsdShort(amount),
    };
}

function totalRowLabel(t, scope) {
    if (scope === 'active_panel') {
        return t('member.team.rowTotalActiveLr');
    }
    if (scope === 'super') {
        return t('member.team.rowTotalSuperLr');
    }

    return t('member.team.rowTotalSubLr');
}

function lastDayInTeamLabel(t, scope, date) {
    if (scope === 'active_panel') {
        return t('member.team.rowLastDayInTeamActive', { date });
    }
    if (scope === 'super') {
        return t('member.team.rowLastDayInTeamSuper', { date });
    }

    return t('member.team.rowLastDayInTeamSub', { date });
}

/** Per-day rows (yesterday / today blocks) — same detail as admin explanation tables. */
function buildDayDetailRows(t, day, scope) {
    if (!day?.date) {
        return [];
    }
    const carryIn = carryOutDisplay(day.carry_in_left ?? 0, day.carry_in_right ?? 0);
    const carryOut = carryOutDisplay(day.display_carry_left ?? day.carry_out_left ?? 0, day.display_carry_right ?? day.carry_out_right ?? 0);
    const rows = [
        {
            label: lastDayInTeamLabel(t, scope, day.date),
            left: day.team_new_left ?? 0,
            right: day.team_new_right ?? 0,
            highlight: true,
        },
        {
            label: t('member.team.rowMatchingCarryBefore', { date: day.date }),
            left: carryIn.left,
            right: carryIn.right,
        },
    ];

    const pairs = Number(day.pairs_matched ?? 0) | 0;
    const matchLabel =
        pairs > 0
            ? t('member.team.rowDayMatchBuckets', { pairs, date: day.date })
            : t('member.team.rowNoMatchDay', { date: day.date });
    rows.push({
        label: day.closing_recorded
            ? matchLabel
            : t('member.team.rowDayMatchPending', { date: day.date }),
        left: day.carry_in_left ?? 0,
        right: day.carry_in_right ?? 0,
    });

    rows.push({
        label: day.income_eligible
            ? t('member.team.rowMatchingCarryAfter', { date: day.date })
            : t('member.team.rowTeamCarryDisplay', { date: day.date }),
        left: carryOut.left,
        right: carryOut.right,
    });

    const payout = day.payout_usd ?? '0.00';
    rows.push({
        label: t('member.team.rowDayIncome', { date: day.date }),
        left: fmtUsdShort(payout),
        right: fmtUsdShort(payout),
    });

    if (!day.income_eligible && pairs > 0) {
        rows.push({
            label: t('member.team.rowPairsHeldDay', { date: day.date, pairs: day.pairs_held ?? pairs }),
            left: '—',
            right: '—',
        });
    }

    return rows;
}

/** Team total + yesterday table + today table (Active / Sub / Super). */
function buildDualDayLegTables(t, legMatch, scope = 'panel') {
    const m = legMatch ?? {};
    const y = m.days?.yesterday;
    const td = m.days?.today;

    if (y?.date && td?.date) {
        return {
            totalRows: [
                {
                    label: totalRowLabel(t, scope),
                    left: m.total_left ?? y.total_left ?? 0,
                    right: m.total_right ?? y.total_right ?? 0,
                },
            ],
            yesterdayRows: buildDayDetailRows(t, y, scope),
            todayRows: buildDayDetailRows(t, td, scope),
            yesterdayDate: y.date,
            todayDate: td.date,
        };
    }

    return {
        totalRows: buildCompactLegRowsLegacy(t, m, scope).filter((r) => r.label === totalRowLabel(t, scope)),
        yesterdayRows: buildCompactLegRowsLegacy(t, m, scope).slice(1),
        todayRows: [],
        yesterdayDate: m.team_volume_date ?? '',
        todayDate: m.today_date ?? '',
    };
}

/** Fallback when API has no `days` yet. */
function buildCompactLegRowsLegacy(t, m, scope) {
    const lastClosedDate = m.last_closed_date ?? m.team_volume_date ?? m.today_date ?? '';
    const lastDayLeft = m.last_day_team_left ?? m.today_new_left ?? 0;
    const lastDayRight = m.last_day_team_right ?? m.today_new_right ?? 0;
    const carryIn = carryOutDisplay(m.total_carry_left ?? 0, m.total_carry_right ?? 0);
    const carryAfterLeft = m.display_carry_left ?? m.current_carry_left ?? 0;
    const carryAfterRight = m.display_carry_right ?? m.current_carry_right ?? 0;
    const carryNow = carryOutDisplay(carryAfterLeft, carryAfterRight);
    return [
        {
            label: totalRowLabel(t, scope),
            left: m.total_left ?? 0,
            right: m.total_right ?? 0,
        },
        {
            label: lastDayInTeamLabel(t, scope, lastClosedDate),
            left: lastDayLeft,
            right: lastDayRight,
            highlight: true,
        },
        {
            label: t('member.team.rowMatchingCarryBefore', { date: lastClosedDate }),
            left: carryIn.left,
            right: carryIn.right,
        },
        {
            label: m.income_eligible
                ? t('member.team.rowMatchingCarryAfter', { date: lastClosedDate })
                : t('member.team.rowTeamCarryDisplay', { date: lastClosedDate }),
            left: carryNow.left,
            right: carryNow.right,
        },
        matchingIncomeRow(t, m),
    ];
}

function buildCompactLegRows(t, legMatch, scope = 'panel') {
    return buildDualDayLegTables(t, legMatch, scope);
}

function buildCompactSubSuperLegRows(t, legMatch) {
    return buildCompactLegRows(t, legMatch, 'panel');
}

/** Strong leg par carry number; weak leg par — (0 nahi). */
function carryOutDisplay(left, right) {
    const l = Number(left) | 0;
    const r = Number(right) | 0;
    if (l > 0 && r === 0) {
        return { left: l, right: CARRY_DASH };
    }
    if (r > 0 && l === 0) {
        return { left: CARRY_DASH, right: r };
    }
    return { left: l, right: r };
}

function buildActiveLegRows(legs, t, _activeMatching, legMatch) {
    if (!legs?.left || !legs?.right) {
        return [];
    }

    return buildCompactLegRows(t, legMatch, 'active_panel');
}

function buildSubLegRows(_legs, t, _subMatching, legMatch) {
    return buildCompactLegRows(t, legMatch, 'panel');
}

function buildSuperLegRows(_legs, t, _superMatching, legMatch) {
    return buildCompactLegRows(t, legMatch, 'super');
}

function EmptyNodeSlot({ side = 'left' }) {
    const { t } = useTranslation();
    const tone =
        side === 'left'
            ? 'border-cyan-400/25 bg-cyan-500/[0.04] text-cyan-200/55'
            : 'border-fuchsia-400/25 bg-fuchsia-500/[0.04] text-fuchsia-200/55';
    return (
        <div className={`flex h-[100px] w-[100px] shrink-0 items-center justify-center rounded-full border-2 border-dashed text-[11px] font-semibold sm:h-[132px] sm:w-[132px] sm:text-[13px] ${tone}`}>
            {t('member.ui.empty')}
        </div>
    );
}

function LoadingNodeSlot({ side = 'left' }) {
    const tone =
        side === 'left'
            ? 'border-cyan-400/45 bg-cyan-500/[0.07] text-cyan-200/85'
            : 'border-fuchsia-400/45 bg-fuchsia-500/[0.07] text-fuchsia-200/85';
    return (
        <div className={`flex h-[100px] w-[100px] shrink-0 items-center justify-center rounded-full border-2 border-dashed text-[11px] font-semibold sm:h-[132px] sm:w-[132px] sm:text-[13px] ${tone}`}>
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M12 3a9 9 0 11-9 9" strokeLinecap="round" />
            </svg>
        </div>
    );
}

/**
 * Premium connector lines that sit between a parent and its left+right children.
 * Cyan → for the left arm, Fuchsia → for the right arm. Pure CSS / SVG (no extra deps).
 */
function ConnectorBracket() {
    return (
        <div className="relative h-5 w-full sm:h-7" aria-hidden>
            {/** Vertical drop from parent */}
            <span className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 bg-gradient-to-b from-white/40 to-white/10 sm:h-3" />
            {/** Horizontal beam — left half cyan, right half fuchsia */}
            <span className="absolute left-0 right-1/2 top-2 h-px bg-gradient-to-r from-cyan-400/10 via-cyan-400/55 to-cyan-300/80 sm:top-3" />
            <span className="absolute left-1/2 right-0 top-2 h-px bg-gradient-to-r from-fuchsia-300/80 via-fuchsia-400/55 to-fuchsia-400/10 sm:top-3" />
            {/** Vertical drops down to each child */}
            <span className="absolute left-[calc(25%-0.5px)] top-2 h-3 w-px bg-gradient-to-b from-cyan-300/80 to-cyan-400/30 sm:top-3 sm:h-4" />
            <span className="absolute right-[calc(25%-0.5px)] top-2 h-3 w-px bg-gradient-to-b from-fuchsia-300/80 to-fuchsia-400/30 sm:top-3 sm:h-4" />
        </div>
    );
}

function LegLabel({ side }) {
    const { t } = useTranslation();
    const tone =
        side === 'left'
            ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100'
            : 'border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100';
    return (
        <span className={`rounded-full border px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em] sm:px-2 sm:py-0.5 sm:text-[9px] ${tone}`}>
            {t(side === 'left' ? 'member.ui.left' : 'member.ui.right')}
        </span>
    );
}

/**
 * Focus-on-click binary tree. Clicking any node re-roots the viewer on that user
 * and shows their 2-level subtree (= 7 members in left-to-right order).
 */
function TreeNode({ node, expandedIds, loadingIds, onFocus, isRoot = false }) {
    if (!node) {
        return <EmptyNodeSlot />;
    }

    const hasChildren = Boolean(node.has_left || node.has_right);
    const isExpanded = hasChildren && expandedIds.has(node.id);
    const isLoading = loadingIds.has(node.id);

    return (
        <div className="flex flex-col items-center">
            <NodeChip
                node={node}
                onClick={() => onFocus(node)}
                isLoading={isLoading}
                isExpanded={isExpanded}
                hasChildren={hasChildren}
                isRoot={isRoot}
            />
            {isExpanded ? (
                <div className="flex w-full flex-col items-center">
                    <ConnectorBracket />
                    <div className="flex gap-3 sm:gap-12">
                        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                            <LegLabel side="left" />
                            {node.has_left ? (
                                node.left ? (
                                    <TreeNode node={node.left} expandedIds={expandedIds} loadingIds={loadingIds} onFocus={onFocus} />
                                ) : (
                                    <LoadingNodeSlot side="left" />
                                )
                            ) : (
                                <EmptyNodeSlot side="left" />
                            )}
                        </div>
                        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                            <LegLabel side="right" />
                            {node.has_right ? (
                                node.right ? (
                                    <TreeNode node={node.right} expandedIds={expandedIds} loadingIds={loadingIds} onFocus={onFocus} />
                                ) : (
                                    <LoadingNodeSlot side="right" />
                                )
                            ) : (
                                <EmptyNodeSlot side="right" />
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function totalTeamTableCaption(tab, t, volumeDate) {
    const suffix = volumeDate ? ` (${volumeDate})` : '';
    switch (tab) {
        case 'active':
            return t('member.team.captionActive') + suffix;
        case 'sub':
            return t('member.team.captionSub') + suffix;
        case 'super':
            return t('member.team.captionSuper') + suffix;
        default:
            return '';
    }
}

export default function MemberTeamPage() {
    const { t, i18n } = useTranslation();
    const [data, setData] = useState(null);
    const [tree, setTree] = useState(null);
    const [depth, setDepth] = useState(4);
    const [showTree, setShowTree] = useState(false);
    const [err, setErr] = useState(null);
    const [treeErr, setTreeErr] = useState(null);
    /** Tree navigation state. The full subtree is fetched once (depth 100) and stored
     *  in `tree`; the renderer only ever shows 7 nodes at a time around `focusedNodeId`. */
    const [rootId, setRootId] = useState(null);
    const [focusedNodeId, setFocusedNodeId] = useState(null);
    const [loadingIds, setLoadingIds] = useState(() => new Set());
    const [isFocusedView, setIsFocusedView] = useState(false);
    const [uidQuery, setUidQuery] = useState('');
    const [uidSearching, setUidSearching] = useState(false);
    const [totalTeamTab, setTotalTeamTab] = useState('active');
    const [directExpanded, setDirectExpanded] = useState(false);
    const [treePreviewExpanded, setTreePreviewExpanded] = useState(true);
    const [levelIncomeExpanded, setLevelIncomeExpanded] = useState(false);
    const [inviteLinksExpanded, setInviteLinksExpanded] = useState(false);
    const [matchingIncomeTab, setMatchingIncomeTab] = useState('sub');
    const [panelMatchData, setPanelMatchData] = useState(null);
    const [subMatchData, setSubMatchData] = useState(null);
    const [superMatchData, setSuperMatchData] = useState(null);

    const load = useCallback(async () => {
        setErr(null);
        try {
            await prepareSanctum();
            const [ov, pm, sm, sup] = await Promise.all([
                window.axios.get('api/member/team/overview'),
                window.axios.get('api/member/programme/panel-matching'),
                window.axios.get('api/member/programme/sub-panel-matching'),
                window.axios.get('api/member/programme/super-sub-panel-matching'),
            ]);
            setData(ov.data);
            setPanelMatchData(pm.data);
            setSubMatchData(sm.data);
            setSuperMatchData(sup.data);
        } catch (e) {
            setErr(e.response?.data?.message ?? e.message ?? t('member.team.loadFailed'));
            setPanelMatchData(null);
            setSubMatchData(null);
            setSuperMatchData(null);
        }
    }, [t]);

    /** Find a node anywhere in the loaded tree by its DB id. Returns the node object or null. */
    const findNodeById = useCallback((root, id) => {
        if (!root || id == null) {
            return null;
        }
        if (root.id === id) {
            return root;
        }
        return findNodeById(root.left, id) || findNodeById(root.right, id);
    }, []);

    /** Find a node anywhere in the loaded tree by login_uid (case-insensitive). */
    const findNodeByLoginUid = useCallback((root, uid) => {
        if (!root || !uid) {
            return null;
        }
        const target = String(uid).trim().toLowerCase();
        const dive = (n) => {
            if (!n) {
                return null;
            }
            if (String(n.login_uid ?? '').toLowerCase() === target) {
                return n;
            }
            return dive(n.left) || dive(n.right);
        };
        return dive(root);
    }, []);

    /**
     * Initial load: fetch the *entire* binary subtree once (depth 100) so all
     * navigation afterwards is instant — no further API calls needed for clicks.
     * Display, however, is intentionally limited to 7 nodes at a time
     * (focused user + their direct L/R + grandchildren).
     */
    const loadTree = useCallback(async () => {
        setTreeErr(null);
        try {
            await prepareSanctum();
            const { data: json } = await window.axios.get('api/member/team/binary-tree', { params: { depth: 100 } });
            if (json?.tree) {
                setTree(json.tree);
                setRootId(json.tree.id);
                setFocusedNodeId(json.tree.id);
                setShowTree(true);
                setTreePreviewExpanded(true);
                setIsFocusedView(false);
            }
            setLoadingIds(new Set());
        } catch (e) {
            setTreeErr(e.response?.data?.message ?? e.message ?? t('member.team.loadTreeFailed'));
        }
    }, [t]);

    /**
     * Click any visible chip → just shift the focused window to that node within
     * the already-loaded tree. No API call, instant.
     */
    const focusNode = useCallback(
        (node) => {
            if (!node?.id) {
                return;
            }
            setFocusedNodeId(node.id);
            setIsFocusedView(rootId !== null && node.id !== rootId);
        },
        [rootId],
    );

    /**
     * Search by login_uid. First tries the cached tree (instant — no network).
     * Falls back to a fresh API request if the UID isn't in the loaded subtree
     * (rare, only for very deep teams beyond depth 100).
     */
    const searchByUid = useCallback(async () => {
        const q = uidQuery.trim();
        if (q === '') {
            return;
        }
        setTreeErr(null);

        const local = findNodeByLoginUid(tree, q);
        if (local) {
            setFocusedNodeId(local.id);
            setIsFocusedView(local.id !== rootId);
            return;
        }

        setUidSearching(true);
        try {
            await prepareSanctum();
            const { data: json } = await window.axios.get('api/member/team/binary-tree', {
                params: { uid: q, depth: 100 },
            });
            if (json?.tree) {
                setTree(json.tree);
                setRootId(json.tree.id);
                setFocusedNodeId(json.tree.id);
                setIsFocusedView(true);
                setShowTree(true);
                setTreePreviewExpanded(true);
                setLoadingIds(new Set());
            }
        } catch (e) {
            setTreeErr(e.response?.data?.message ?? e.message ?? t('member.team.loadTreeFailed'));
        } finally {
            setUidSearching(false);
        }
    }, [uidQuery, tree, rootId, findNodeByLoginUid, t]);

    /** Returns the node currently in focus; falls back to the actual root. */
    const focusedNode = useMemo(() => {
        if (!tree) {
            return null;
        }
        if (focusedNodeId == null) {
            return tree;
        }
        return findNodeById(tree, focusedNodeId) || tree;
    }, [tree, focusedNodeId, findNodeById]);

    /** IDs that should be expanded in the renderer to keep the visible window at 7 nodes:
     *  the focused node + its immediate left + immediate right. Grandchildren show inside
     *  those children's slot (not as their own expanded subtree). */
    const visibleExpandedIds = useMemo(() => {
        const ids = new Set();
        if (!focusedNode?.id) {
            return ids;
        }
        ids.add(focusedNode.id);
        if (focusedNode.left?.id) {
            ids.add(focusedNode.left.id);
        }
        if (focusedNode.right?.id) {
            ids.add(focusedNode.right.id);
        }
        return ids;
    }, [focusedNode]);

    /** Reset focus back to the original root user (the page owner). */
    const resetFocusToRoot = useCallback(() => {
        if (rootId != null) {
            setFocusedNodeId(rootId);
            setIsFocusedView(false);
        }
    }, [rootId]);

    useEffect(() => {
        load();
    }, [load]);

    const lv = data?.level_income;

    const inviteUrls = useMemo(() => {
        const code = data?.self?.referral_code?.trim();
        if (!code || typeof window === 'undefined') {
            return { left: '', right: '' };
        }
        const origin = window.location.origin;
        return {
            left: `${origin}/register/panelist?${new URLSearchParams({ ref: code, side: 'left' }).toString()}`,
            right: `${origin}/register/panelist?${new URLSearchParams({ ref: code, side: 'right' }).toString()}`,
        };
    }, [data?.self?.referral_code]);

    const todayDate = data?.team_volume?.today_date ?? data?.leg_match?.active_panel?.today_date ?? '';

    const totalTeamTables = useMemo(() => {
        if (!data?.legs) {
            return { totalRows: [], yesterdayRows: [], todayRows: [], yesterdayDate: '', todayDate: '' };
        }
        if (totalTeamTab === 'active') {
            return buildActiveLegRows(data.legs, t, data?.matching?.active_panel, data?.leg_match?.active_panel);
        }
        if (totalTeamTab === 'sub') {
            return buildSubLegRows(data.legs, t, data?.matching?.sub_panel, data?.leg_match?.panel);
        }
        return buildSuperLegRows(data.legs, t, data?.matching?.super_sub_panel, data?.leg_match?.super);
    }, [
        data?.legs,
        data?.leg_match,
        data?.matching?.active_panel,
        data?.matching?.sub_panel,
        data?.matching?.super_sub_panel,
        todayDate,
        totalTeamTab,
        t,
        i18n.resolvedLanguage,
    ]);

    const tabBtn =
        'rounded-2xl border px-3 py-2 text-[12px] font-semibold transition sm:px-3 sm:text-sm';

    return (
        <div className="relative space-y-4 pb-24">
            <div className="relative overflow-hidden rounded-[24px] border border-[#8B5CF6]/30 bg-gradient-to-r from-[#1a1030] via-[#0c1529] to-[#111827] p-4 shadow-[0_16px_38px_rgba(76,29,149,0.28)]">
                <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#7C3AED]/25 blur-2xl" />
                <div className="pointer-events-none absolute -left-6 bottom-0 h-16 w-16 rounded-full bg-cyan-400/15 blur-2xl" />
                <div className="relative flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => loadTree()}
                        className="rounded-full bg-gradient-to-r from-[#7C3AED] to-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(124,58,237,0.4)] ring-1 ring-[#A78BFA]/45"
                    >
                        {t('member.team.binaryTree')}
                    </button>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#8B5CF6]/50 bg-[#7C3AED]/20 text-[#DDD6FE]">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 8l8-4 8 4-8 4-8-4zm0 8l8-4 8 4-8 4-8-4zm8-4v8" />
                        </svg>
                    </span>
                </div>
            </div>

            {err ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</p> : null}

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {showTree && tree ? (
                    <button
                        type="button"
                        id="binary-tree-preview-toggle"
                        onClick={() => setTreePreviewExpanded((v) => !v)}
                        aria-expanded={treePreviewExpanded}
                        aria-controls="binary-tree-preview-panel"
                        className="rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[12px] font-semibold text-white transition hover:border-[#8E6BFF]/40 hover:bg-white/[0.1] active:scale-[0.98]"
                    >
                        {treePreviewExpanded ? t('member.ui.hide') : t('member.ui.show')}
                    </button>
                ) : null}
            </div>
            {treeErr ? <p className="text-sm text-amber-200">{treeErr}</p> : null}

            {showTree && tree && treePreviewExpanded ? (
                <div id="binary-tree-preview-panel">
                    <RmsCard variant="elevated" className="!p-3 sm:!p-4">
                        <p className="text-base font-bold text-white">{t('member.team.binaryTreeTitle')}</p>
                        <p className="mt-0.5 text-[11px] text-[#A0AEC0]">{t('member.team.sameLegStatsHint')}</p>
                        {data?.legs && totalTeamTables.totalRows?.length > 0 ? (
                            <div className="space-y-3">
                                <LegsCompareTable
                                    rows={totalTeamTables.totalRows}
                                    caption={t('member.team.captionTeamTotalAllTime')}
                                    accent={totalTeamTab}
                                />
                                {totalTeamTables.yesterdayRows?.length > 0 ? (
                                    <LegsCompareTable
                                        rows={totalTeamTables.yesterdayRows}
                                        caption={t('member.team.captionDayYesterday', {
                                            date: totalTeamTables.yesterdayDate,
                                        })}
                                        accent={totalTeamTab}
                                    />
                                ) : null}
                                {totalTeamTables.todayRows?.length > 0 ? (
                                    <LegsCompareTable
                                        rows={totalTeamTables.todayRows}
                                        caption={t('member.team.captionDayToday', {
                                            date: totalTeamTables.todayDate,
                                        })}
                                        accent={totalTeamTab}
                                    />
                                ) : null}
                            </div>
                        ) : (
                            <p className="mt-2 text-[12px] text-[#94A3B8]">{t('member.team.reloadIfStatsMissing')}</p>
                        )}
                        <div className="mt-5 border-t border-white/[0.1] pt-4 sm:mt-9 sm:pt-8">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px] sm:tracking-[0.2em]">{t('member.team.placementTree')}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] sm:mt-3 sm:gap-2.5 sm:text-[11px]">
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/55 bg-gradient-to-br from-emerald-400/30 via-emerald-500/25 to-emerald-700/30 px-2 py-0.5 font-semibold text-emerald-50 shadow-[0_2px_8px_rgba(16,185,129,0.25)]">
                                    <span className="h-2 w-2 rounded-full bg-emerald-300" /> {t('member.ui.active')}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/55 bg-gradient-to-br from-sky-300/35 via-cyan-300/25 to-sky-400/35 px-2 py-0.5 font-semibold text-sky-50 shadow-[0_2px_8px_rgba(56,189,248,0.25)]">
                                    <span className="h-2 w-2 rounded-full bg-sky-200" /> {t('member.ui.sub')}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/65 bg-gradient-to-br from-yellow-300/40 via-amber-400/30 to-yellow-600/40 px-2 py-0.5 font-semibold text-amber-50 shadow-[0_2px_8px_rgba(234,179,8,0.3)]">
                                    <span className="h-2 w-2 rounded-full bg-amber-200" /> {t('member.ui.super')}
                                </span>
                            </div>
                            <div className="mt-3 rounded-xl border border-white/10 bg-[#0a0f1f]/70 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-3">
                                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65 sm:text-[11px]">
                                    <svg className="h-3.5 w-3.5 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" />
                                    </svg>
                                    Search any user in your tree
                                </p>
                                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                                    <form
                                        className="flex min-w-0 flex-1 items-center gap-1.5"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            searchByUid();
                                        }}
                                    >
                                        <div className="relative flex-1">
                                            <svg className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" />
                                            </svg>
                                            <input
                                                type="text"
                                                value={uidQuery}
                                                onChange={(e) => setUidQuery(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        searchByUid();
                                                    }
                                                }}
                                                placeholder="Enter User ID e.g. RMS123…"
                                                className="w-full rounded-lg border border-white/20 bg-[#0b1020] py-2 pl-9 pr-2 text-[13px] font-medium text-white placeholder:text-white/45 focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                                                aria-label="Search by User ID"
                                                autoComplete="off"
                                                spellCheck={false}
                                            />
                                            {uidQuery ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setUidQuery('')}
                                                    aria-label="Clear search"
                                                    className="absolute right-2 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
                                                >
                                                    ×
                                                </button>
                                            ) : null}
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={uidSearching || uidQuery.trim() === ''}
                                            className="shrink-0 rounded-lg border border-cyan-300/45 bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-2 text-[12px] font-bold text-white shadow-[0_6px_18px_rgba(6,182,212,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {uidSearching ? 'Searching…' : 'Search'}
                                        </button>
                                    </form>
                                    {isFocusedView ? (
                                        <button
                                            type="button"
                                            onClick={() => resetFocusToRoot()}
                                            className="shrink-0 rounded-lg border border-emerald-400/45 bg-emerald-500/15 px-3 py-2 text-[12px] font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/25"
                                        >
                                            ← Back to my tree
                                        </button>
                                    ) : null}
                                </div>
                                {treeErr ? (
                                    <p className="mt-2 rounded-md border border-red-400/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">
                                        {treeErr}
                                    </p>
                                ) : null}
                            </div>
                            <p className="mt-2 text-center text-[10px] text-[#94A3B8] sm:text-[11px]">
                                Showing 7 members at a time (you + L/R + their L/R). Full team data is loaded — tap any User ID to instantly focus on that member.
                            </p>
                            <div
                                className="relative -mx-3 mt-2 max-h-[72vh] overflow-auto overscroll-contain rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0b1228]/80 via-[#0a0f24]/85 to-[#080d1f]/90 px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_36px_rgba(0,0,0,0.35)] sm:-mx-4 sm:mt-3 sm:max-h-[82vh] sm:px-4 sm:py-6"
                                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
                            >
                                <div className="pointer-events-none absolute -left-10 top-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />
                                <div className="pointer-events-none absolute -right-10 bottom-10 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-3xl" aria-hidden />
                                <div
                                    className="relative inline-flex w-max min-w-full"
                                    style={{ justifyContent: 'safe center' }}
                                >
                                    <TreeNode
                                        node={focusedNode}
                                        expandedIds={visibleExpandedIds}
                                        loadingIds={loadingIds}
                                        onFocus={focusNode}
                                        isRoot
                                    />
                                </div>
                            </div>
                        </div>
                    </RmsCard>
                </div>
            ) : null}

            {data ? (
                <>
                    <RmsCard variant="elevated" className="!rounded-[24px] !border-white/10 !bg-[#0e1529]/95 !p-4 sm:!p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h2 className="text-lg font-bold text-white">{t('member.team.myTeam')}</h2>
                            <button className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                                </svg>
                                Info
                            </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Total team breakdown">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={totalTeamTab === 'active'}
                                id="team-tab-active"
                                onClick={() => setTotalTeamTab('active')}
                                className={[
                                    tabBtn,
                                    totalTeamTab === 'active'
                                        ? 'border-[#8B5CF6]/60 bg-gradient-to-r from-[#7C3AED]/35 to-[#2563EB]/25 text-white ring-1 ring-[#A78BFA]/45 shadow-[0_0_20px_rgba(124,58,237,0.22)]'
                                        : 'border-emerald-500/15 bg-emerald-950/15 text-emerald-200/70 hover:border-emerald-500/35 hover:text-emerald-100',
                                ].join(' ')}
                            >
                                Active Panel
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={totalTeamTab === 'sub'}
                                id="team-tab-sub"
                                onClick={() => setTotalTeamTab('sub')}
                                className={[
                                    tabBtn,
                                    totalTeamTab === 'sub'
                                        ? 'border-sky-400/55 bg-sky-500/22 text-sky-50 ring-1 ring-sky-400/40 shadow-[0_0_20px_rgba(14,165,233,0.14)]'
                                        : 'border-sky-500/20 bg-[#0f2037]/70 text-sky-200/80 hover:border-sky-500/35 hover:text-sky-100',
                                ].join(' ')}
                            >
                                Sub Panel
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={totalTeamTab === 'super'}
                                id="team-tab-super"
                                onClick={() => setTotalTeamTab('super')}
                                className={[
                                    tabBtn,
                                    totalTeamTab === 'super'
                                        ? 'border-amber-400/55 bg-amber-500/20 text-amber-50 ring-1 ring-amber-400/35 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                                        : 'border-amber-500/20 bg-[#2a1a0e]/70 text-amber-200/80 hover:border-amber-500/35 hover:text-amber-100',
                                ].join(' ')}
                            >
                                Super Panel
                            </button>
                        </div>
                        {data.self?.is_active === false ? (
                            <p className="mt-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-[12px] leading-snug text-amber-100/95">
                                {t('member.team.inactivePanelistCarryOnly')}
                            </p>
                        ) : null}
                        <div className="mt-3 space-y-3" role="tabpanel" aria-labelledby={`team-tab-${totalTeamTab}`}>
                            <p className="text-[11px] leading-snug text-slate-400">
                                {totalTeamTableCaption(totalTeamTab, t, data?.team_volume?.date)}
                            </p>
                            {totalTeamTables.totalRows?.length > 0 ? (
                                <>
                                    <LegsCompareTable
                                        rows={totalTeamTables.totalRows}
                                        caption={t('member.team.captionTeamTotalAllTime')}
                                        accent={totalTeamTab}
                                    />
                                    {totalTeamTables.yesterdayRows?.length > 0 ? (
                                        <LegsCompareTable
                                            rows={totalTeamTables.yesterdayRows}
                                            caption={t('member.team.captionDayYesterday', {
                                                date: totalTeamTables.yesterdayDate,
                                            })}
                                            accent={totalTeamTab}
                                        />
                                    ) : null}
                                    {totalTeamTables.todayRows?.length > 0 ? (
                                        <LegsCompareTable
                                            rows={totalTeamTables.todayRows}
                                            caption={t('member.team.captionDayToday', {
                                                date: totalTeamTables.todayDate,
                                            })}
                                            accent={totalTeamTab}
                                        />
                                    ) : null}
                                </>
                            ) : null}
                        </div>
                    </RmsCard>

                    <RmsCard variant="neon" className="!rounded-[24px] !border-[#8B5CF6]/30 !bg-[#0f162b]/95 !p-4 sm:!p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2 sm:items-center">
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#8B5CF6]/40 bg-[#7C3AED]/20 text-[#DDD6FE]">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5V9H2v11h5m10 0v-5a3 3 0 00-6 0v5m6 0H7" />
                                    </svg>
                                </span>
                                <div>
                                    <h2 className="text-lg font-bold text-white">{t('member.team.directReferrals')}</h2>
                                    <p className="text-[11px] text-slate-300">Total direct members</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <p className="text-sm text-[#A0AEC0]">
                                    <span className="text-lg font-bold tabular-nums text-white">{data.direct.count}</span>
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setDirectExpanded((v) => !v)}
                                    aria-expanded={directExpanded}
                                    aria-controls="direct-referrals-panel"
                                    id="direct-referrals-toggle"
                                    className="rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[12px] font-semibold text-white transition hover:border-[#8E6BFF]/40 hover:bg-white/[0.1] active:scale-[0.98]"
                                >
                                    {directExpanded ? t('member.ui.hide') : t('member.ui.show')}
                                </button>
                            </div>
                        </div>
                        {directExpanded ? (
                            <div id="direct-referrals-panel" className="mt-2">
                                <p className="text-[11px] text-[#94A3B8]">{t('member.team.bySponsorHint')}</p>
                                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-white/[0.08]">
                                    <table className="w-full text-left text-[12px]">
                                        <thead className="sticky top-0 bg-[#0f172a] text-[11px] text-[#94A3B8]">
                                            <tr>
                                                <th className="px-2 py-1.5">{t('member.team.thUserId')}</th>
                                                <th className="px-2 py-1.5">{t('member.team.thCode')}</th>
                                                <th className="px-2 py-1.5">{t('member.team.thActShort')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.direct.members.map((m) => (
                                                <tr key={m.id} className="border-t border-white/[0.06]">
                                                    <td className="px-2 py-1.5 font-mono text-[12px] uppercase tracking-wide text-white">{(m.login_uid || t('member.ui.dash')).toString().toUpperCase()}</td>
                                                    <td className="px-2 py-1.5 font-mono text-[11px] uppercase text-[#8E6BFF]">{m.referral_code}</td>
                                                    <td className="px-2 py-1.5">{m.is_active ? t('member.ui.yes') : t('member.ui.dash')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {data.direct.count === 0 ? (
                                        <p className="px-2 py-3 text-center text-[12px] text-[#94A3B8]">{t('member.ui.noneYet')}</p>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}
                    </RmsCard>

                    <RmsCard variant="neon" className="!rounded-[24px] !border-emerald-400/25 !bg-[#0f1a22]/95 !p-4 sm:!p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2 sm:items-center">
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/15 text-emerald-200">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 17l6-6 4 4 8-8M3 21h18" />
                                    </svg>
                                </span>
                                <div>
                                    <h2 className="text-lg font-bold text-white">{t('member.team.levelIncome')}</h2>
                                    <p className="text-[11px] text-emerald-200/80">View your level-wise earnings</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <button
                                    type="button"
                                    onClick={() => setLevelIncomeExpanded((v) => !v)}
                                    aria-expanded={levelIncomeExpanded}
                                    aria-controls="level-income-panel"
                                    id="level-income-toggle"
                                    className="rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[12px] font-semibold text-white transition hover:border-[#8E6BFF]/40 hover:bg-white/[0.1] active:scale-[0.98]"
                                >
                                    {levelIncomeExpanded ? t('member.ui.hide') : t('member.ui.show')}
                                </button>
                            </div>
                        </div>
                        {levelIncomeExpanded && lv ? (
                            <div id="level-income-panel" className="mt-2 space-y-2">
                                <div className="flex flex-wrap gap-3 text-[12px]">
                                    <span className="text-[#A0AEC0]">
                                        {t('member.team.todayLabel')}{' '}
                                        <strong className="text-white">{fmtUsd(lv.earned_today_usd, i18n.language)}</strong>
                                    </span>
                                    <span className={lv.eligible ? 'text-emerald-400' : 'text-amber-300'}>
                                        {lv.eligible ? t('member.team.payoutOk') : t('member.team.needActivePanel')}
                                    </span>
                                </div>

                                <div className="max-h-52 overflow-x-auto overflow-y-auto rounded-lg border border-white/[0.08]">
                                    <table className="w-full min-w-[480px] text-left text-[12px]">
                                        <thead className="sticky top-0 bg-[#0f172a] text-[11px] text-[#94A3B8]">
                                            <tr>
                                                <th className="px-2 py-1.5">{t('member.team.thLv')}</th>
                                                <th className="px-2 py-1.5 text-right">{t('member.team.thToday')}</th>
                                                <th className="px-2 py-1.5 text-right">{t('member.team.thTeam')}</th>
                                                <th className="px-2 py-1.5 text-right">{t('member.team.thAct')}</th>
                                                <th className="px-2 py-1.5 text-right">{t('member.team.thSub')}</th>
                                                <th className="px-2 py-1.5 text-right">{t('member.team.thSuper')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lv.levels?.map((row) => (
                                                <tr key={row.level} className="border-t border-white/[0.06]">
                                                    <td className="px-2 py-1 text-white">L{row.level}</td>
                                                    <td className="px-2 py-1 text-right tabular-nums text-white">{fmtUsd(row.earned_today_usd, i18n.language)}</td>
                                                    <td className="px-2 py-1 text-right tabular-nums text-white">{row.team_members ?? t('member.ui.dash')}</td>
                                                    <td className="px-2 py-1 text-right tabular-nums text-emerald-300/95">{row.active_panelists ?? t('member.ui.dash')}</td>
                                                    <td className="px-2 py-1 text-right tabular-nums text-sky-200/90">{row.sub_panel_slots ?? t('member.ui.dash')}</td>
                                                    <td className="px-2 py-1 text-right tabular-nums text-amber-200/90">{row.super_sub_panel_slots ?? t('member.ui.dash')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : null}
                    </RmsCard>

                    <RmsCard variant="neon" className="!rounded-[24px] !border-[#8B5CF6]/30 !bg-[#0f162b]/95 !p-4 sm:!p-4">
                        <h2 className="text-lg font-bold text-white">{t('member.team.matchingIncome')}</h2>
                        <p className="mt-1 text-xs text-[#94A3B8]">{t('member.team.matchingIncomeHint')}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5" role="tablist" aria-label={t('member.team.ariaMatching')}>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={matchingIncomeTab === 'sub'}
                                id="matching-income-tab-sub"
                                onClick={() => setMatchingIncomeTab('sub')}
                                className={[
                                    tabBtn,
                                    matchingIncomeTab === 'sub'
                                        ? 'border-sky-400/55 bg-sky-500/22 text-sky-50 ring-1 ring-sky-400/40 shadow-[0_0_20px_rgba(14,165,233,0.14)]'
                                        : 'border-sky-500/15 bg-sky-950/20 text-sky-200/75 hover:border-sky-500/35 hover:text-sky-100',
                                ].join(' ')}
                            >
                                {t('member.team.subMatching')}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={matchingIncomeTab === 'super'}
                                id="matching-income-tab-super"
                                onClick={() => setMatchingIncomeTab('super')}
                                className={[
                                    tabBtn,
                                    matchingIncomeTab === 'super'
                                        ? 'border-amber-400/55 bg-amber-500/20 text-amber-50 ring-1 ring-amber-400/35 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                                        : 'border-amber-500/15 bg-amber-950/20 text-amber-200/75 hover:border-amber-500/35 hover:text-amber-100',
                                ].join(' ')}
                            >
                                {t('member.team.superMatching')}
                            </button>
                        </div>
                        <div
                            className="mt-2"
                            role="tabpanel"
                            aria-labelledby={
                                matchingIncomeTab === 'sub' ? 'matching-income-tab-sub' : 'matching-income-tab-super'
                            }
                            id="matching-income-panel"
                        >
                            {matchingIncomeTab === 'sub' && subMatchData ? (
                                <>
                                    <p className="mb-2 text-xs text-sky-200/80">{t('member.team.subMatchingHint')}</p>
                                    <MatchingIncomeTable
                                        dark
                                        embedded
                                        comfortable
                                        hideEarnedHighlight
                                        hideLiveData
                                        variant="sub"
                                        panelData={panelMatchData}
                                        subData={subMatchData}
                                    />
                                </>
                            ) : null}
                            {matchingIncomeTab === 'super' && superMatchData ? (
                                <>
                                    <p className="mb-2 text-xs text-amber-200/80">{t('member.team.superMatchingHint')}</p>
                                    <MatchingIncomeTable
                                        dark
                                        embedded
                                        comfortable
                                        hideEarnedHighlight
                                        hideLiveData
                                        variant="super"
                                        superData={superMatchData}
                                    />
                                </>
                            ) : null}
                            {matchingIncomeTab === 'sub' && !subMatchData ? (
                                <p className="text-sm text-[#94A3B8]">{t('member.team.dataNotLoaded')}</p>
                            ) : null}
                            {matchingIncomeTab === 'super' && !superMatchData ? (
                                <p className="text-sm text-[#94A3B8]">{t('member.team.dataNotLoaded')}</p>
                            ) : null}
                        </div>
                    </RmsCard>

                    <RmsCard variant="neon" className="!rounded-[24px] !border-emerald-500/25 !bg-[#0f162b]/95 !p-4 sm:!p-4">
                        <h2 className="text-lg font-bold text-white">{t('member.team.closingIncomeHistory')}</h2>
                        <p className="mt-1 text-xs text-[#94A3B8]">{t('member.team.closingIncomeHistoryHint')}</p>
                        {Array.isArray(data?.closing_income_history) && data.closing_income_history.length > 0 ? (
                            <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
                                <table className="min-w-full text-left text-sm text-white">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-black/25 text-[11px] uppercase tracking-wide text-[#94A3B8]">
                                            <th className="px-3 py-2">{t('member.team.thClosingDate')}</th>
                                            <th className="px-3 py-2">{t('member.team.thClosingScope')}</th>
                                            <th className="px-3 py-2 text-right">{t('member.team.thClosingBuckets')}</th>
                                            <th className="px-3 py-2 text-right">{t('member.team.thClosingPairs')}</th>
                                            <th className="px-3 py-2 text-right">{t('member.team.thClosingPayout')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.closing_income_history.map((row, idx) => {
                                            const paid = row.income_paid === true;
                                            const payoutLabel = paid
                                                ? fmtUsdShort(row.payout_usd)
                                                : row.income_eligible === false
                                                  ? t('member.team.closingCarryOnly')
                                                  : fmtUsdShort('0');
                                            return (
                                                <tr key={`${row.closing_date}-${row.scope}-${idx}`} className="border-t border-white/[0.07]">
                                                    <td className="px-3 py-2 tabular-nums">{row.closing_date}</td>
                                                    <td className="px-3 py-2">{closingScopeLabel(t, row.scope)}</td>
                                                    <td className="px-3 py-2 text-right tabular-nums text-cyan-200/90">
                                                        {row.left_carry_in} / {row.right_carry_in}
                                                    </td>
                                                    <td className="px-3 py-2 text-right tabular-nums">{row.pairs_matched}</td>
                                                    <td
                                                        className={`px-3 py-2 text-right tabular-nums font-semibold ${paid ? 'text-emerald-300' : 'text-[#94A3B8]'}`}
                                                    >
                                                        {payoutLabel}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="mt-3 text-sm text-[#94A3B8]">{t('member.team.closingIncomeNone')}</p>
                        )}
                    </RmsCard>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <StatCard
                            label={t('member.team.statActiveNetwork')}
                            value={data.network.active_members}
                            hint={t('member.team.statActiveNetworkHint')}
                            tone="active"
                        />
                        <StatCard label={t('member.team.statYourSubPanels')} value={data.self.sub_panel_count} tone="sub" />
                        <StatCard
                            label={t('member.team.statSuperSubPanels')}
                            value={data.self.super_panel_count ?? data.self.super_sub_panel_count ?? 0}
                            tone="super"
                        />
                    </div>

                    <RmsCard variant="elevated" className="!p-2.5 sm:!p-3">
                        <div className="flex flex-wrap items-start justify-between gap-1.5 sm:items-center">
                            <h2 className="text-base font-bold text-white">{t('member.team.referralLinks')}</h2>
                            <button
                                type="button"
                                onClick={() => setInviteLinksExpanded((v) => !v)}
                                aria-expanded={inviteLinksExpanded}
                                aria-controls="binary-referral-links-panel"
                                id="binary-referral-links-toggle"
                                className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-white transition hover:border-[#8E6BFF]/40 hover:bg-white/[0.1] active:scale-[0.98]"
                            >
                                {inviteLinksExpanded ? t('member.ui.hide') : t('member.ui.show')}
                            </button>
                        </div>
                        {inviteLinksExpanded ? (
                            <div id="binary-referral-links-panel" className="mt-1.5 space-y-1.5">
                                {data.self?.referral_code ? (
                                    <>
                                        <p className="text-[10px] text-[#94A3B8]">
                                            {t('member.team.referralCodeHint', { code: data.self.referral_code })}
                                        </p>
                                        <div className="space-y-1.5">
                                            <BinaryReferralLegRow
                                                title={t('member.team.leftLink')}
                                                url={inviteUrls.left}
                                                tone="emerald"
                                                status="Primary"
                                            />
                                            <BinaryReferralLegRow
                                                title={t('member.team.rightLink')}
                                                url={inviteUrls.right}
                                                tone="violet"
                                                status="Secondary"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-amber-200/90">{t('member.team.referralUnavailable')}</p>
                                )}
                            </div>
                        ) : null}
                    </RmsCard>
                </>
            ) : null}

            <div className="fixed bottom-2 left-1/2 z-20 w-[min(460px,calc(100vw-20px))] -translate-x-1/2 rounded-[24px] border border-white/10 bg-[#0a1020]/95 p-2 shadow-[0_20px_44px_rgba(0,0,0,0.5)] backdrop-blur-xl md:hidden">
                <div className="grid grid-cols-5 gap-1 text-[10px]">
                    {['Dashboard', 'Team', 'Surveys', 'Wallet', 'More'].map((item) => (
                        <span
                            key={item}
                            className={`flex min-h-[44px] items-center justify-center rounded-xl font-semibold ${
                                item === 'Team'
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

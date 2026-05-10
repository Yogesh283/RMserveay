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

function NodeChip({ node, onClick, isExpanded = false, isLoading = false, hasChildren = false }) {
    const { t } = useTranslation();
    const superN = node.super_sub_panel_count > 0;
    const subOnly = !superN && node.sub_panel_count > 0;
    const isActive = Boolean(node.is_active);

    /** Tier-coded vivid gradient + glow. Active gets an emerald halo on top. */
    const tier = superN
        ? {
              bg: 'bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.45),rgba(245,158,11,0.18)_45%,rgba(120,53,15,0.35)_100%)]',
              border: 'border-amber-300/60',
              text: 'text-amber-50',
              glow: 'shadow-[0_8px_24px_rgba(245,158,11,0.35),inset_0_0_18px_rgba(251,191,36,0.18)]',
          }
        : subOnly
          ? {
                bg: 'bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.45),rgba(14,165,233,0.18)_45%,rgba(12,74,110,0.35)_100%)]',
                border: 'border-sky-300/60',
                text: 'text-sky-50',
                glow: 'shadow-[0_8px_24px_rgba(56,189,248,0.32),inset_0_0_18px_rgba(56,189,248,0.18)]',
            }
          : isActive
            ? {
                  bg: 'bg-[radial-gradient(circle_at_30%_20%,rgba(167,139,250,0.45),rgba(139,92,246,0.2)_45%,rgba(76,29,149,0.4)_100%)]',
                  border: 'border-violet-300/55',
                  text: 'text-violet-50',
                  glow: 'shadow-[0_8px_24px_rgba(139,92,246,0.32),inset_0_0_16px_rgba(167,139,250,0.16)]',
              }
            : {
                  bg: 'bg-[radial-gradient(circle_at_30%_20%,rgba(148,163,184,0.28),rgba(71,85,105,0.18)_50%,rgba(15,23,42,0.45)_100%)]',
                  border: 'border-slate-400/30',
                  text: 'text-slate-100',
                  glow: 'shadow-[0_6px_18px_rgba(0,0,0,0.5)]',
              };

    const activeRing = isActive ? 'ring-2 ring-emerald-400/55 sm:ring-2 sm:ring-emerald-400/70' : 'ring-1 ring-white/10';

    const interactive = typeof onClick === 'function' && hasChildren;
    const cursorCls = interactive ? 'cursor-pointer hover:brightness-115 active:scale-[0.96]' : 'cursor-default';

    const Wrapper = interactive ? 'button' : 'div';
    const wrapperProps = interactive
        ? {
              type: 'button',
              onClick,
              'aria-expanded': isExpanded,
              'aria-label': isExpanded ? `Collapse ${node.login_uid || node.name}` : `Expand ${node.login_uid || node.name}`,
          }
        : {};

    return (
        <Wrapper
            {...wrapperProps}
            className={`relative flex h-[86px] w-[86px] shrink-0 flex-col items-center justify-center gap-px overflow-hidden rounded-full border px-1.5 py-1 text-center backdrop-blur-md ring-offset-1 ring-offset-[#0b0f1a] transition duration-200 sm:h-[118px] sm:w-[118px] sm:gap-1 sm:px-2.5 sm:py-2 sm:ring-offset-2 ${tier.bg} ${tier.border} ${tier.text} ${tier.glow} ${activeRing} ${cursorCls}`}
        >
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.18),transparent_60%)]"
            />
            <p className="relative z-10 max-w-[92%] truncate text-[9px] font-bold leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] sm:text-[11px] sm:leading-tight">
                {node.login_uid || node.name || t('member.ui.dash')}
            </p>
            <div className="relative z-10 flex max-w-full flex-wrap justify-center gap-px sm:gap-0.5">
                {isActive ? (
                    <span className="rounded-full border border-emerald-300/50 bg-emerald-500/30 px-0.5 py-px text-[8px] font-bold uppercase leading-none text-emerald-50 shadow-[0_0_8px_rgba(16,185,129,0.5)] sm:px-1.5 sm:py-0.5 sm:text-[10px] sm:leading-normal">
                        {t('member.ui.active')}
                    </span>
                ) : (
                    <span className="rounded-full border border-white/15 bg-slate-500/30 px-0.5 py-px text-[8px] font-semibold uppercase leading-none text-slate-200 sm:px-1.5 sm:py-0.5 sm:text-[10px] sm:leading-normal">
                        {t('member.ui.inactive')}
                    </span>
                )}
                {superN ? (
                    <span className="rounded-full border border-amber-300/55 bg-amber-500/35 px-0.5 py-px text-[8px] font-bold leading-none text-amber-50 shadow-[0_0_8px_rgba(245,158,11,0.45)] sm:px-1.5 sm:py-0.5 sm:text-[10px] sm:leading-normal">
                        {t('member.ui.super')}
                    </span>
                ) : null}
                {subOnly ? (
                    <span className="rounded-full border border-sky-300/55 bg-sky-500/35 px-0.5 py-px text-[8px] font-bold leading-none text-sky-50 shadow-[0_0_8px_rgba(56,189,248,0.45)] sm:px-1.5 sm:py-0.5 sm:text-[10px] sm:leading-normal">
                        {t('member.ui.sub')}
                    </span>
                ) : null}
            </div>
            <p className="relative z-10 max-w-[94%] truncate text-[8px] font-semibold leading-none text-white/80 tabular-nums sm:text-[10px] sm:leading-tight">
                {t('member.team.nodeSubSuper', { sub: node.sub_panel_count, super: node.super_sub_panel_count })}
            </p>
            {hasChildren ? (
                <span
                    className={`absolute -bottom-1 right-1 z-20 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-extrabold leading-none shadow-[0_4px_12px_rgba(0,0,0,0.55)] sm:-bottom-1.5 sm:right-1.5 sm:h-6 sm:w-6 sm:text-[12px] ${
                        isExpanded
                            ? 'border-emerald-200/70 bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_0_14px_rgba(16,185,129,0.65)]'
                            : 'border-fuchsia-200/70 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_14px_rgba(217,70,239,0.6)]'
                    }`}
                    aria-hidden
                >
                    {isLoading ? (
                        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M12 3a9 9 0 11-9 9" strokeLinecap="round" />
                        </svg>
                    ) : isExpanded ? (
                        '−'
                    ) : (
                        '+'
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
                        <tr key={idx} className="border-t border-white/[0.07]">
                            <td className="bg-black/20 px-3 py-2 text-left text-[12px] font-medium text-white/90 sm:px-4 sm:text-sm">{row.label}</td>
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

function buildActiveLegRows(legs, t, activeMatching) {
    if (!legs?.left || !legs?.right) {
        return [];
    }
    const L = legs.left;
    const R = legs.right;
    const am = activeMatching ?? {};
    const carryL = Number(am.carry_left ?? 0) | 0;
    const carryR = Number(am.carry_right ?? 0) | 0;
    const pairsToday = Number(am.pairs_paid_today ?? 0) | 0;
    const lapseL = Number(am.today_left_lapsed ?? 0) | 0;
    const lapseR = Number(am.today_right_lapsed ?? 0) | 0;
    const payoutToday = am.earned_today_usd ?? '0.00';
    return [
        { label: t('member.team.rowRegistrations'), left: L.count, right: R.count },
        { label: t('member.team.rowActivePanelists'), left: L.active, right: R.active },
        { label: 'Active carry forward', left: carryL, right: carryR },
        { label: 'Matched pairs today', left: pairsToday, right: pairsToday },
        { label: 'Payout today', left: fmtUsdShort(payoutToday), right: fmtUsdShort(payoutToday) },
        { label: 'Lapsed today', left: lapseL, right: lapseR },
    ];
}

function buildSubLegRows(legs, t, panelMatching, subMatching) {
    if (!legs?.left || !legs?.right) {
        return [];
    }
    const L = legs.left;
    const R = legs.right;
    const pm = panelMatching ?? {};
    const sm = subMatching ?? {};
    const carryL = Number(pm.carry_left ?? 0) | 0;
    const carryR = Number(pm.carry_right ?? 0) | 0;
    const pairsToday = Number(sm.cumulative_matched_panels_today ?? 0) | 0;
    const lapsedToday = Number(sm.today_milestone_lapsed_pairs ?? 0) | 0;
    const payoutToday = sm.today_milestone_paid_usd ?? sm.earned_today_usd ?? '0.00';
    return [
        {
            label: t('member.team.rowTeamSubPanels'),
            left: L.sub_panels,
            right: R.sub_panels,
        },
        {
            label: 'Sub carry forward',
            left: carryL,
            right: carryR,
        },
        {
            label: 'Matched pairs today',
            left: pairsToday,
            right: pairsToday,
        },
        {
            label: 'Payout today',
            left: fmtUsdShort(payoutToday),
            right: fmtUsdShort(payoutToday),
        },
        {
            label: 'Lapsed today',
            left: lapsedToday,
            right: lapsedToday,
        },
    ];
}

function buildSuperLegRows(legs, t, superMatching) {
    if (!legs?.left || !legs?.right) {
        return [];
    }
    const L = legs.left;
    const R = legs.right;
    const sup = superMatching ?? {};
    const carryL = Number(sup.carry_left ?? 0) | 0;
    const carryR = Number(sup.carry_right ?? 0) | 0;
    const pairsToday = Number(sup.cumulative_matched_panels_today ?? 0) | 0;
    const lapsedToday = Number(sup.today_milestone_lapsed_pairs ?? 0) | 0;
    const payoutToday = sup.today_milestone_paid_usd ?? sup.earned_today_usd ?? '0.00';
    return [
        {
            label: t('member.team.rowTeamSuperSub'),
            left: L.super_sub_panels,
            right: R.super_sub_panels,
        },
        {
            label: 'Super carry forward',
            left: carryL,
            right: carryR,
        },
        {
            label: 'Matched pairs today',
            left: pairsToday,
            right: pairsToday,
        },
        {
            label: 'Payout today',
            left: fmtUsdShort(payoutToday),
            right: fmtUsdShort(payoutToday),
        },
        {
            label: 'Lapsed today',
            left: lapsedToday,
            right: lapsedToday,
        },
    ];
}

/** Same three concepts as section 2, for the tree card summary strip. */
function buildTreeLegMatchingRows(legs, t, activeMatching) {
    if (!legs?.left || !legs?.right) {
        return [];
    }
    const L = legs.left;
    const R = legs.right;
    const am = activeMatching ?? {};
    const carryAL = Number(am.carry_left ?? 0) | 0;
    const carryAR = Number(am.carry_right ?? 0) | 0;
    return [
        {
            label: 'Active matching carry',
            left: carryAL,
            right: carryAR,
        },
        {
            label: t('member.team.rowMatchingPanels'),
            left: `${L.carry_panel_left} / ${L.carry_panel_right}`,
            right: `${R.carry_panel_left} / ${R.carry_panel_right}`,
        },
        {
            label: t('member.team.rowSubMatchingPanels'),
            left: L.sub_panels,
            right: R.sub_panels,
        },
        {
            label: t('member.team.rowSuperMatchingPanels'),
            left: `${L.carry_super_left} / ${L.carry_super_right}`,
            right: `${R.carry_super_left} / ${R.carry_super_right}`,
        },
    ];
}

function EmptyNodeSlot() {
    const { t } = useTranslation();
    return (
        <div className="flex h-[86px] w-[86px] shrink-0 items-center justify-center rounded-full border border-dashed border-slate-400/30 bg-[radial-gradient(circle_at_50%_50%,rgba(148,163,184,0.08),transparent_70%)] text-[9px] font-medium text-slate-400/80 sm:h-[118px] sm:w-[118px] sm:text-[11px]">
            {t('member.ui.empty')}
        </div>
    );
}

function LoadingNodeSlot() {
    return (
        <div className="flex h-[86px] w-[86px] shrink-0 items-center justify-center rounded-full border border-dashed border-violet-400/50 bg-[radial-gradient(circle_at_50%_50%,rgba(167,139,250,0.18),transparent_70%)] text-[9px] text-violet-200 shadow-[0_0_16px_rgba(139,92,246,0.25)] sm:h-[118px] sm:w-[118px] sm:text-[11px]">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M12 3a9 9 0 11-9 9" strokeLinecap="round" />
            </svg>
        </div>
    );
}

/** Vertical connector descending from a parent node into the L/R split bar. */
function TrunkConnector() {
    return (
        <span
            aria-hidden
            className="block h-3 w-[2px] rounded-full bg-gradient-to-b from-violet-400/80 via-fuchsia-400/55 to-transparent shadow-[0_0_8px_rgba(167,139,250,0.45)] sm:h-5"
        />
    );
}

/** Top horizontal+vertical "elbow" connector for each child column.
 *  side: 'left' | 'right'. Colors: left=cyan, right=fuchsia. */
function ElbowConnector({ side }) {
    const isLeft = side === 'left';
    const horizontal = isLeft
        ? 'right-1/2 bg-gradient-to-l from-cyan-400/75 via-cyan-400/50 to-cyan-400/15'
        : 'left-1/2 bg-gradient-to-r from-fuchsia-400/75 via-fuchsia-400/50 to-fuchsia-400/15';
    const verticalColor = isLeft
        ? 'bg-gradient-to-b from-cyan-400/75 to-cyan-400/15 shadow-[0_0_6px_rgba(34,211,238,0.5)]'
        : 'bg-gradient-to-b from-fuchsia-400/75 to-fuchsia-400/15 shadow-[0_0_6px_rgba(217,70,239,0.5)]';
    return (
        <span aria-hidden className="relative block h-4 w-full sm:h-6">
            <span className={`absolute top-0 h-[2px] w-1/2 rounded-full ${horizontal}`} />
            <span
                className={`absolute top-0 h-full w-[2px] rounded-full ${verticalColor}`}
                style={{ left: 'calc(50% - 1px)' }}
            />
        </span>
    );
}

function TreeNode({ node, expandedIds, loadingIds, onToggle, depth = 0 }) {
    const { t } = useTranslation();
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
                onClick={hasChildren ? () => onToggle(node) : undefined}
                isExpanded={isExpanded}
                isLoading={isLoading}
                hasChildren={hasChildren}
            />
            {hasChildren && isExpanded ? (
                <>
                    <TrunkConnector />
                    <div className="flex items-stretch gap-3 sm:gap-12">
                        <div className="relative flex w-[86px] flex-col items-center sm:w-[118px]">
                            <ElbowConnector side="left" />
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-cyan-400/45 bg-cyan-500/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-cyan-100 shadow-[0_0_8px_rgba(34,211,238,0.3)] sm:text-[10px]">
                                <span className="h-1 w-1 rounded-full bg-cyan-300" /> {t('member.ui.left')}
                            </span>
                            <div className="mt-1.5 sm:mt-2">
                                {node.has_left ? (
                                    node.left ? (
                                        <TreeNode node={node.left} expandedIds={expandedIds} loadingIds={loadingIds} onToggle={onToggle} depth={depth + 1} />
                                    ) : (
                                        <LoadingNodeSlot />
                                    )
                                ) : (
                                    <EmptyNodeSlot />
                                )}
                            </div>
                        </div>
                        <div className="relative flex w-[86px] flex-col items-center sm:w-[118px]">
                            <ElbowConnector side="right" />
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-fuchsia-400/45 bg-fuchsia-500/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-fuchsia-100 shadow-[0_0_8px_rgba(217,70,239,0.3)] sm:text-[10px]">
                                <span className="h-1 w-1 rounded-full bg-fuchsia-300" /> {t('member.ui.right')}
                            </span>
                            <div className="mt-1.5 sm:mt-2">
                                {node.has_right ? (
                                    node.right ? (
                                        <TreeNode node={node.right} expandedIds={expandedIds} loadingIds={loadingIds} onToggle={onToggle} depth={depth + 1} />
                                    ) : (
                                        <LoadingNodeSlot />
                                    )
                                ) : (
                                    <EmptyNodeSlot />
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}

/** Replace a node in the tree with a fresh subtree (immutable). */
function replaceTreeNode(root, id, replacement) {
    if (!root) {
        return root;
    }
    if (root.id === id) {
        return replacement;
    }
    const nextLeft = replaceTreeNode(root.left, id, replacement);
    const nextRight = replaceTreeNode(root.right, id, replacement);
    if (nextLeft === root.left && nextRight === root.right) {
        return root;
    }
    return { ...root, left: nextLeft, right: nextRight };
}

function totalTeamTableCaption(tab, t) {
    switch (tab) {
        case 'active':
            return t('member.team.captionActive');
        case 'sub':
            return t('member.team.captionSub');
        case 'super':
            return t('member.team.captionSuper');
        default:
            return '';
    }
}

export default function MemberTeamPage() {
    const { t, i18n } = useTranslation();
    const [data, setData] = useState(null);
    const [tree, setTree] = useState(null);
    const [depth, setDepth] = useState(2);
    const [showTree, setShowTree] = useState(false);
    const [err, setErr] = useState(null);
    const [treeErr, setTreeErr] = useState(null);
    /** Per-node expanded / fetch state for click-to-open binary tree. */
    const [expandedIds, setExpandedIds] = useState(() => new Set());
    const [loadingIds, setLoadingIds] = useState(() => new Set());
    /** Tree zoom level for fit-to-screen on mobile (0.55–1.25). */
    const [treeZoom, setTreeZoom] = useState(1);
    const [totalTeamTab, setTotalTeamTab] = useState('active');
    const [directExpanded, setDirectExpanded] = useState(false);
    const [treePreviewExpanded, setTreePreviewExpanded] = useState(true);
    const [levelIncomeExpanded, setLevelIncomeExpanded] = useState(false);
    const [inviteLinksExpanded, setInviteLinksExpanded] = useState(false);
    /** Sub vs super matching table inside “Matching income” (Active is shown
     *  in the My Team section instead). */
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

    const loadTree = useCallback(async () => {
        setTreeErr(null);
        try {
            await prepareSanctum();
            const { data: json } = await window.axios.get('api/member/team/binary-tree', { params: { depth } });
            setTree(json.tree);
            /** Root is auto-expanded; deeper nodes require a click. */
            setExpandedIds(json.tree?.id != null ? new Set([json.tree.id]) : new Set());
            setLoadingIds(new Set());
            setShowTree(true);
            setTreePreviewExpanded(true);
        } catch (e) {
            setTreeErr(e.response?.data?.message ?? e.message ?? t('member.team.loadTreeFailed'));
        }
    }, [depth, t]);

    const fetchSubtree = useCallback(async (nodeId) => {
        setLoadingIds((prev) => {
            const next = new Set(prev);
            next.add(nodeId);
            return next;
        });
        try {
            await prepareSanctum();
            const { data: json } = await window.axios.get('api/member/team/binary-tree', {
                params: { node_id: nodeId, depth: 2 },
            });
            if (json?.tree) {
                setTree((prev) => replaceTreeNode(prev, nodeId, json.tree));
            }
        } catch (e) {
            setTreeErr(e.response?.data?.message ?? e.message ?? t('member.team.loadTreeFailed'));
        } finally {
            setLoadingIds((prev) => {
                const next = new Set(prev);
                next.delete(nodeId);
                return next;
            });
        }
    }, [t]);

    const toggleTreeNode = useCallback(
        (node) => {
            if (!node) {
                return;
            }
            const id = node.id;
            const hasChildren = Boolean(node.has_left || node.has_right);
            if (!hasChildren) {
                return;
            }

            setExpandedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) {
                    next.delete(id);
                } else {
                    next.add(id);
                }
                return next;
            });

            /** First-time expand: pull this subtree if its children weren't fetched yet. */
            const needsFetch = (node.has_left && !node.left) || (node.has_right && !node.right);
            const alreadyExpanded = expandedIds.has(id);
            const alreadyLoading = loadingIds.has(id);
            if (!alreadyExpanded && needsFetch && !alreadyLoading) {
                fetchSubtree(id);
            }
        },
        [expandedIds, loadingIds, fetchSubtree],
    );

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

    const totalTeamRows = useMemo(() => {
        if (!data?.legs) {
            return [];
        }
        if (totalTeamTab === 'active') {
            return buildActiveLegRows(data.legs, t, data?.matching?.active_panel);
        }
        if (totalTeamTab === 'sub') {
            return buildSubLegRows(data.legs, t, data?.matching?.panel, data?.matching?.sub_panel);
        }
        return buildSuperLegRows(data.legs, t, data?.matching?.super_sub_panel);
    }, [
        data?.legs,
        data?.matching?.active_panel,
        data?.matching?.panel,
        data?.matching?.sub_panel,
        data?.matching?.super_sub_panel,
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
                        {data?.legs ? (
                            <LegsCompareTable rows={buildTreeLegMatchingRows(data.legs, t, data?.matching?.active_panel)} caption={t('member.team.matchCaption')} />
                        ) : (
                            <p className="mt-2 text-[12px] text-[#94A3B8]">{t('member.team.reloadIfStatsMissing')}</p>
                        )}
                        <div className="mt-5 border-t border-white/[0.1] pt-4 sm:mt-9 sm:pt-8">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px] sm:tracking-[0.2em]">{t('member.team.placementTree')}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] sm:mt-3 sm:gap-2.5 sm:text-[10px]">
                                <span className="rounded-full border border-emerald-400/45 bg-emerald-500/12 px-1.5 py-0.5 font-medium text-emerald-100 sm:px-2">
                                    {t('member.team.legendRingActive')}
                                </span>
                                <span className="rounded-full border border-sky-400/40 bg-sky-500/12 px-1.5 py-0.5 font-medium text-sky-100 sm:px-2">{t('member.ui.sub')}</span>
                                <span className="rounded-full border border-amber-400/45 bg-amber-500/12 px-1.5 py-0.5 font-medium text-amber-100 sm:px-2">{t('member.ui.super')}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[10px] text-[#94A3B8] sm:text-[11px]">
                                    {t('member.team.tapToExpandHint', { defaultValue: 'Tap any node with a + badge to expand its branch.' })}
                                </p>
                                <div className="inline-flex items-center gap-1 rounded-full border border-violet-300/25 bg-[#0b1020]/70 p-0.5 shadow-[0_0_18px_rgba(124,58,237,0.18)] backdrop-blur">
                                    <button
                                        type="button"
                                        onClick={() => setTreeZoom((z) => Math.max(0.55, +(z - 0.1).toFixed(2)))}
                                        disabled={treeZoom <= 0.55}
                                        aria-label="Zoom out"
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/15 text-cyan-100 transition hover:border-cyan-300/70 hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-40 sm:h-7 sm:w-7"
                                    >
                                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 12h14" /></svg>
                                    </button>
                                    <span className="min-w-[2.6rem] text-center text-[10px] font-bold tabular-nums text-violet-100 sm:text-[11px]">
                                        {Math.round(treeZoom * 100)}%
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setTreeZoom((z) => Math.min(1.25, +(z + 0.1).toFixed(2)))}
                                        disabled={treeZoom >= 1.25}
                                        aria-label="Zoom in"
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100 transition hover:border-fuchsia-300/70 hover:bg-fuchsia-500/30 disabled:cursor-not-allowed disabled:opacity-40 sm:h-7 sm:w-7"
                                    >
                                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTreeZoom(1)}
                                        aria-label="Reset zoom"
                                        className="ml-0.5 inline-flex h-6 items-center justify-center rounded-full border border-violet-400/40 bg-violet-500/15 px-2 text-[10px] font-bold text-violet-100 transition hover:border-violet-300/70 hover:bg-violet-500/30 sm:h-7 sm:text-[11px]"
                                    >
                                        Fit
                                    </button>
                                </div>
                            </div>
                            <div
                                className="relative -mx-3 mt-3 overflow-x-auto overscroll-contain rounded-2xl border border-violet-300/15 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.12),transparent_60%),radial-gradient(circle_at_50%_100%,rgba(34,211,238,0.08),transparent_60%)] px-3 pb-8 pt-4 sm:-mx-4 sm:mt-6 sm:max-h-[82vh] sm:overflow-auto sm:pb-4 sm:pt-6"
                                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
                            >
                                <span aria-hidden className="pointer-events-none absolute -left-12 top-8 h-32 w-32 rounded-full bg-violet-500/15 blur-3xl" />
                                <span aria-hidden className="pointer-events-none absolute -right-12 bottom-8 h-32 w-32 rounded-full bg-cyan-500/12 blur-3xl" />
                                <div
                                    className="relative flex min-w-full"
                                    style={{ justifyContent: 'safe center' }}
                                >
                                    <div
                                        style={{
                                            transform: `scale(${treeZoom})`,
                                            transformOrigin: 'top center',
                                            transition: 'transform 180ms ease',
                                        }}
                                    >
                                        <TreeNode
                                            node={tree}
                                            expandedIds={expandedIds}
                                            loadingIds={loadingIds}
                                            onToggle={toggleTreeNode}
                                        />
                                    </div>
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
                        <div className="mt-3" role="tabpanel" aria-labelledby={`team-tab-${totalTeamTab}`}>
                            <LegsCompareTable rows={totalTeamRows} caption={totalTeamTableCaption(totalTeamTab, t)} accent={totalTeamTab} />
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
                                                <th className="px-2 py-1.5">{t('member.team.thName')}</th>
                                                <th className="px-2 py-1.5">{t('member.team.thCode')}</th>
                                                <th className="px-2 py-1.5">{t('member.team.thActShort')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.direct.members.map((m) => (
                                                <tr key={m.id} className="border-t border-white/[0.06]">
                                                    <td className="px-2 py-1.5 text-white">{m.name}</td>
                                                    <td className="px-2 py-1.5 font-mono text-[11px] text-[#8E6BFF]">{m.referral_code}</td>
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
                                    <p className="text-[11px] text-emerald-200/80">View your level wise earnings</p>
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
                        <h2 className="text-lg font-bold text-white">Hedling Machin Tebal Income</h2>
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
                            aria-labelledby={matchingIncomeTab === 'sub' ? 'matching-income-tab-sub' : 'matching-income-tab-super'}
                            id="matching-income-panel"
                        >
                            {matchingIncomeTab === 'sub' && panelMatchData && subMatchData ? (
                                <MatchingIncomeTable
                                    dark
                                    embedded
                                    comfortable
                                    hideEarnedHighlight
                                    variant="sub"
                                    panelData={panelMatchData}
                                    subData={subMatchData}
                                />
                            ) : null}
                            {matchingIncomeTab === 'super' && superMatchData ? (
                                <MatchingIncomeTable dark embedded comfortable hideEarnedHighlight variant="super" superData={superMatchData} />
                            ) : null}
                            {matchingIncomeTab === 'sub' && (!panelMatchData || !subMatchData) ? (
                                <p className="text-sm text-[#94A3B8]">{t('member.team.dataNotLoaded')}</p>
                            ) : null}
                            {matchingIncomeTab === 'super' && !superMatchData ? (
                                <p className="text-sm text-[#94A3B8]">{t('member.team.dataNotLoaded')}</p>
                            ) : null}
                        </div>
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

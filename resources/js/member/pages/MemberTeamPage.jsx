import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { prepareSanctum } from '../../lib/auth';
import { MatchingIncomeTable } from '../components/MatchingIncomeTable';
import { RmsCard } from '../components/rms';

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

function BinaryReferralLegRow({ title, url, borderClass, labelClass }) {
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
                await navigator.share({ title: shareTitle, text: shareTitle, url });
                return;
            } catch (e) {
                if (e?.name === 'AbortError') {
                    return;
                }
            }
        }
        await handleCopy();
    };

    const btn =
        'rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[12px] font-semibold text-white transition hover:border-[#8E6BFF]/40 hover:bg-white/[0.1] active:scale-[0.98]';

    return (
        <div className={`rounded-lg border p-2.5 sm:p-3 ${borderClass}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-wide ${labelClass}`}>{title}</p>
            <p className="mt-1.5 break-all font-mono text-[11px] leading-snug text-white/90 sm:text-[12px]">{url || t('member.ui.dash')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" onClick={handleCopy} disabled={!url} className={`${btn} disabled:cursor-not-allowed disabled:opacity-40`}>
                    {copied ? t('member.ui.copied') : t('member.ui.copy')}
                </button>
                <button type="button" onClick={handleShare} disabled={!url} className={`${btn} disabled:cursor-not-allowed disabled:opacity-40`}>
                    {t('member.ui.share')}
                </button>
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

function NodeChip({ node }) {
    const { t } = useTranslation();
    const superN = node.super_sub_panel_count > 0;
    const subOnly = !superN && node.sub_panel_count > 0;
    const ring = node.is_active ? 'ring-1 ring-emerald-400/65 sm:ring-2 sm:ring-emerald-400/70' : '';

    const tierStyle = superN
        ? 'border-amber-400/50 bg-amber-500/10 text-amber-50'
        : subOnly
          ? 'border-sky-400/45 bg-sky-500/10 text-sky-50'
          : 'border-white/15 bg-white/[0.06] text-white';

    return (
        <div
            className={`flex h-[86px] w-[86px] shrink-0 flex-col items-center justify-center gap-px rounded-full border px-1.5 py-1 text-center shadow-[0_6px_18px_rgba(0,0,0,0.34)] ring-offset-1 ring-offset-[#0b0f1a] sm:h-[118px] sm:w-[118px] sm:gap-1 sm:px-2.5 sm:py-2 sm:shadow-[0_8px_28px_rgba(0,0,0,0.38)] sm:ring-offset-2 ${tierStyle} ${ring}`}
        >
            <p className="max-w-[92%] truncate text-[9px] font-semibold leading-none sm:text-[11px] sm:leading-tight">{node.name || t('member.ui.dash')}</p>
            <div className="flex max-w-full flex-wrap justify-center gap-px sm:gap-0.5">
                {node.is_active ? (
                    <span className="rounded-full bg-emerald-500/20 px-0.5 py-px text-[8px] font-semibold uppercase leading-none text-emerald-300 sm:px-1.5 sm:py-0.5 sm:text-[10px] sm:leading-normal">
                        {t('member.ui.active')}
                    </span>
                ) : (
                    <span className="rounded-full bg-white/10 px-0.5 py-px text-[8px] uppercase leading-none text-[#94A3B8] sm:px-1.5 sm:py-0.5 sm:text-[10px] sm:leading-normal">
                        {t('member.ui.inactive')}
                    </span>
                )}
                {superN ? (
                    <span className="rounded-full bg-amber-500/25 px-0.5 py-px text-[8px] leading-none text-amber-100 sm:px-1.5 sm:py-0.5 sm:text-[10px] sm:leading-normal">
                        {t('member.ui.super')}
                    </span>
                ) : null}
                {subOnly ? (
                    <span className="rounded-full bg-sky-500/25 px-0.5 py-px text-[8px] leading-none text-sky-100 sm:px-1.5 sm:py-0.5 sm:text-[10px] sm:leading-normal">
                        {t('member.ui.sub')}
                    </span>
                ) : null}
            </div>
            <p className="max-w-[94%] truncate text-[8px] leading-none text-white/55 sm:text-[10px] sm:leading-tight">
                {t('member.team.nodeSubSuper', { sub: node.sub_panel_count, super: node.super_sub_panel_count })}
            </p>
        </div>
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

function buildActiveLegRows(legs, t) {
    if (!legs?.left || !legs?.right) {
        return [];
    }
    const L = legs.left;
    const R = legs.right;
    return [
        { label: t('member.team.rowRegistrations'), left: L.count, right: R.count },
        { label: t('member.team.rowActivePanelists'), left: L.active, right: R.active },
        {
            label: t('member.team.rowPanelCarry'),
            left: `${L.carry_panel_left} / ${L.carry_panel_right}`,
            right: `${R.carry_panel_left} / ${R.carry_panel_right}`,
        },
    ];
}

function buildSubLegRows(legs, t) {
    if (!legs?.left || !legs?.right) {
        return [];
    }
    const L = legs.left;
    const R = legs.right;
    return [
        {
            label: t('member.team.rowTeamSubPanels'),
            left: L.sub_panels,
            right: R.sub_panels,
        },
        {
            label: t('member.team.rowMatchingSubToday'),
            left: L.sub_matching_cumulative_today ?? 0,
            right: R.sub_matching_cumulative_today ?? 0,
        },
        {
            label: t('member.team.rowCarryPanelLR'),
            left: `${L.carry_panel_left} / ${L.carry_panel_right}`,
            right: `${R.carry_panel_left} / ${R.carry_panel_right}`,
        },
    ];
}

function buildSuperLegRows(legs, t) {
    if (!legs?.left || !legs?.right) {
        return [];
    }
    const L = legs.left;
    const R = legs.right;
    return [
        {
            label: t('member.team.rowTeamSuperSub'),
            left: L.super_sub_panels,
            right: R.super_sub_panels,
        },
        {
            label: t('member.team.rowMatchingSuperToday'),
            left: L.super_matching_cumulative_today ?? 0,
            right: R.super_matching_cumulative_today ?? 0,
        },
        {
            label: t('member.team.rowCarrySuperLR'),
            left: `${L.carry_super_left} / ${L.carry_super_right}`,
            right: `${R.carry_super_left} / ${R.carry_super_right}`,
        },
    ];
}

/** Same three concepts as section 2, for the tree card summary strip. */
function buildTreeLegMatchingRows(legs, t) {
    if (!legs?.left || !legs?.right) {
        return [];
    }
    const L = legs.left;
    const R = legs.right;
    return [
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

function TreeNode({ node }) {
    const { t } = useTranslation();
    if (!node) {
        return (
            <div className="flex h-[86px] w-[86px] shrink-0 items-center justify-center rounded-full border border-dashed border-white/25 bg-white/[0.04] text-[9px] text-[#64748B] sm:h-[118px] sm:w-[118px] sm:text-[11px]">
                {t('member.ui.empty')}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-1.5 sm:gap-2.5">
            <NodeChip node={node} />
            {node.left || node.right ? (
                <div className="flex gap-2.5 border-t border-white/[0.12] pt-2 sm:gap-10 sm:pt-4">
                    <div className="flex flex-col items-center gap-1 sm:gap-1.5">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-sky-300/95 sm:text-[10px]">{t('member.ui.left')}</span>
                        <TreeNode node={node.left} />
                    </div>
                    <div className="flex flex-col items-center gap-1 sm:gap-1.5">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-violet-300/95 sm:text-[10px]">{t('member.ui.right')}</span>
                        <TreeNode node={node.right} />
                    </div>
                </div>
            ) : null}
        </div>
    );
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
    const [depth, setDepth] = useState(4);
    const [showTree, setShowTree] = useState(false);
    const [err, setErr] = useState(null);
    const [treeErr, setTreeErr] = useState(null);
    const [totalTeamTab, setTotalTeamTab] = useState('active');
    const [directExpanded, setDirectExpanded] = useState(false);
    const [treePreviewExpanded, setTreePreviewExpanded] = useState(true);
    const [levelIncomeExpanded, setLevelIncomeExpanded] = useState(false);
    const [inviteLinksExpanded, setInviteLinksExpanded] = useState(false);
    /** Sub vs super milestone table inside “Matching income” (click option — no separate expand toggle). */
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
            setShowTree(true);
            setTreePreviewExpanded(true);
        } catch (e) {
            setTreeErr(e.response?.data?.message ?? e.message ?? t('member.team.loadTreeFailed'));
        }
    }, [depth, t]);

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
        const base = { ref: code, account: 'normal', flow: 'register' };
        return {
            left: `${origin}/?${new URLSearchParams({ ...base, side: 'left' }).toString()}#register`,
            right: `${origin}/?${new URLSearchParams({ ...base, side: 'right' }).toString()}#register`,
        };
    }, [data?.self?.referral_code]);

    const totalTeamRows = useMemo(() => {
        if (!data?.legs) {
            return [];
        }
        if (totalTeamTab === 'active') {
            return buildActiveLegRows(data.legs, t);
        }
        if (totalTeamTab === 'sub') {
            return buildSubLegRows(data.legs, t);
        }
        return buildSuperLegRows(data.legs, t);
    }, [data?.legs, totalTeamTab, t, i18n.resolvedLanguage]);

    const tabBtn =
        'rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition sm:px-3 sm:text-sm';

    return (
        <div className="relative space-y-3 pb-2">
            {err ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</p> : null}

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                    type="button"
                    onClick={() => loadTree()}
                    className="rounded-xl bg-gradient-to-r from-[#6C4CF1] to-[#8E6BFF] px-3 py-2 text-sm font-semibold text-white shadow-md ring-1 ring-white/15 transition hover:brightness-110 active:scale-[0.98]"
                >
                    {t('member.team.binaryTree')}
                </button>
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
                            <LegsCompareTable rows={buildTreeLegMatchingRows(data.legs, t)} caption={t('member.team.matchCaption')} />
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
                            <div className="mt-4 flex justify-center overflow-x-auto pb-1 sm:mt-8 sm:pb-2">
                                <TreeNode node={tree} />
                            </div>
                        </div>
                    </RmsCard>
                </div>
            ) : null}

            {data ? (
                <>
                    <RmsCard variant="elevated" className="!p-3 sm:!p-4">
                        <h2 className="text-lg font-bold text-white">{t('member.team.myTeam')}</h2>
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
                                        ? 'border-emerald-400/55 bg-emerald-500/20 text-emerald-50 ring-1 ring-emerald-400/35 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
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
                                        : 'border-sky-500/15 bg-sky-950/20 text-sky-200/75 hover:border-sky-500/35 hover:text-sky-100',
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
                                        : 'border-amber-500/15 bg-amber-950/20 text-amber-200/75 hover:border-amber-500/35 hover:text-amber-100',
                                ].join(' ')}
                            >
                                Super Panel
                            </button>
                        </div>
                        <div className="mt-3" role="tabpanel" aria-labelledby={`team-tab-${totalTeamTab}`}>
                            <LegsCompareTable rows={totalTeamRows} caption={totalTeamTableCaption(totalTeamTab, t)} accent={totalTeamTab} />
                        </div>
                    </RmsCard>

                    <RmsCard variant="neon" className="!p-3 sm:!p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2 sm:items-center">
                            <h2 className="text-lg font-bold text-white">{t('member.team.directReferrals')}</h2>
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

                    <RmsCard variant="neon" className="!p-3 sm:!p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2 sm:items-center">
                            <h2 className="text-lg font-bold text-white">{t('member.team.levelIncome')}</h2>
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
                                <Link
                                    to="/member/level-income"
                                    className="shrink-0 rounded-lg border border-[#8E6BFF]/40 bg-[#6C4CF1]/20 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-[#6C4CF1]/35"
                                >
                                    {t('member.ui.openArrow')}
                                </Link>
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

                    <RmsCard variant="neon" className="!p-3 sm:!p-4">
                        <h2 className="text-lg font-bold text-white">{t('member.team.matchingIncome')}</h2>
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
                                    variant="sub"
                                    panelData={panelMatchData}
                                    subData={subMatchData}
                                />
                            ) : null}
                            {matchingIncomeTab === 'super' && superMatchData ? (
                                <MatchingIncomeTable dark embedded comfortable variant="super" superData={superMatchData} />
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
                        <StatCard label={t('member.team.statSuperSubPanels')} value={data.self.super_sub_panel_count} tone="super" />
                    </div>

                    <RmsCard variant="elevated" className="!p-3 sm:!p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2 sm:items-center">
                            <h2 className="text-lg font-bold text-white">{t('member.team.referralLinks')}</h2>
                            <button
                                type="button"
                                onClick={() => setInviteLinksExpanded((v) => !v)}
                                aria-expanded={inviteLinksExpanded}
                                aria-controls="binary-referral-links-panel"
                                id="binary-referral-links-toggle"
                                className="rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[12px] font-semibold text-white transition hover:border-[#8E6BFF]/40 hover:bg-white/[0.1] active:scale-[0.98]"
                            >
                                {inviteLinksExpanded ? t('member.ui.hide') : t('member.ui.show')}
                            </button>
                        </div>
                        {inviteLinksExpanded ? (
                            <div id="binary-referral-links-panel" className="mt-2 space-y-2">
                                {data.self?.referral_code ? (
                                    <>
                                        <p className="text-[11px] text-[#94A3B8]">
                                            {t('member.team.referralCodeHint', { code: data.self.referral_code })}
                                        </p>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <BinaryReferralLegRow
                                                title={t('member.team.leftLink')}
                                                url={inviteUrls.left}
                                                borderClass="border-emerald-500/30 bg-emerald-950/20 ring-1 ring-emerald-500/10"
                                                labelClass="text-emerald-200/95"
                                            />
                                            <BinaryReferralLegRow
                                                title={t('member.team.rightLink')}
                                                url={inviteUrls.right}
                                                borderClass="border-violet-500/30 bg-violet-950/20 ring-1 ring-violet-500/10"
                                                labelClass="text-violet-200/95"
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
        </div>
    );
}

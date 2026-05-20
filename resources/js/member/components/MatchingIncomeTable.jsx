/**
 * Shared 4-column milestone table: Panel match table | L | R | Income
 * Used by /member/panel-matching, sub-panel-matching, super-sub-panel-matching.
 */
export function MatchingIncomeTable({
    dark,
    variant,
    panelData,
    subData,
    superData,
    embedded = false,
    /** Slightly larger type (e.g. member team page embedded preview). */
    comfortable = false,
    /** Team page preview can hide milestone rows and show only carry-forward. */
    carryForwardOnly = false,
    /**
     * Render the full milestone table but hide "already paid" indicators (no
     * green emerald row tint, no Paid pill). Used by the team-page preview so
     * the table reads as a pure schedule + L/R carry view without revealing
     * which tiers were already credited.
     */
    hideEarnedHighlight = false,
    /**
     * Hide *all* live progress data (summary chips at the top and live L/R
     * counts inside the cells). When true, the L/R columns simply show the
     * milestone count itself (static schedule), so the table reads as a pure
     * "Left Panels | Right Panels | Income" reference. Used by the team-page
     * sub & super matching tabs.
     */
    hideLiveData = false,
}) {
    /** Team page already wraps in `RmsCard` — no second bordered box when embedded. */
    const card = embedded
        ? 'mt-4'
        : `overflow-hidden rounded-2xl border p-4 sm:p-6 ${
              dark
                  ? 'border-white/10 bg-gradient-to-br from-[#1e293b] via-[#1a2234] to-[#0f172a] shadow-[0_0_40px_rgba(108,76,241,0.12)] ring-1 ring-[#8E6BFF]/20'
                  : 'border-gray-200 bg-white shadow-sm'
          }`;

    function fmtUsd(s) {
        const n = Number.parseFloat(String(s));
        if (Number.isNaN(n)) return '—';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
    }

    function tierPaid(mask, index) {
        const m = Number(mask) || 0;
        return (m & (1 << index)) !== 0;
    }

    const MILESTONES = [2, 4, 8, 16, 32, 64, 128, 256];

    /** Column colour system — headers + body cells */
    const H = {
        milestone: dark
            ? 'border-violet-500/30 bg-gradient-to-b from-violet-600/45 to-violet-900/40 text-violet-100 shadow-inner shadow-violet-500/10'
            : 'border-violet-200 bg-violet-100 text-violet-900',
        L: dark
            ? 'border-cyan-500/30 bg-gradient-to-b from-cyan-600/40 to-cyan-900/35 text-cyan-100 shadow-inner shadow-cyan-500/10'
            : 'border-cyan-200 bg-cyan-100 text-cyan-900',
        R: dark
            ? 'border-fuchsia-500/30 bg-gradient-to-b from-fuchsia-600/40 to-fuchsia-900/35 text-fuchsia-100 shadow-inner shadow-fuchsia-500/10'
            : 'border-fuchsia-200 bg-fuchsia-100 text-fuchsia-900',
        income: dark
            ? 'border-amber-500/30 bg-gradient-to-b from-amber-600/35 to-amber-900/30 text-amber-100 shadow-inner shadow-amber-500/10'
            : 'border-amber-200 bg-amber-100 text-amber-900',
    };

    const thBase = comfortable
        ? 'border-b px-2 py-3 text-left text-[12px] font-bold uppercase tracking-wide sm:px-3 sm:text-sm'
        : 'border-b px-2 py-3 text-left text-[11px] font-bold uppercase tracking-wide sm:px-3';
    const tdBase = comfortable
        ? 'border-b px-2 py-2.5 text-base tabular-nums sm:px-3'
        : 'border-b px-2 py-2.5 text-sm tabular-nums sm:px-3';

    const cellMilestone = (stripe) =>
        dark
            ? `${tdBase} border-white/10 ${stripe ? 'bg-violet-950/25' : 'bg-slate-900/40'} font-medium text-violet-200`
            : `${tdBase} border-gray-100 ${stripe ? 'bg-violet-50/80' : 'bg-white'} text-violet-900`;

    const cellL = (stripe) =>
        dark
            ? `${tdBase} border-cyan-500/10 text-center font-semibold text-cyan-200 ${stripe ? 'bg-cyan-500/10' : 'bg-cyan-500/5'}`
            : `${tdBase} border-cyan-100 text-center font-semibold text-cyan-800 ${stripe ? 'bg-cyan-50' : 'bg-cyan-50/50'}`;

    const cellR = (stripe) =>
        dark
            ? `${tdBase} border-fuchsia-500/10 text-center font-semibold text-fuchsia-200 ${stripe ? 'bg-fuchsia-500/10' : 'bg-fuchsia-500/5'}`
            : `${tdBase} border-fuchsia-100 text-center font-semibold text-fuchsia-800 ${stripe ? 'bg-fuchsia-50' : 'bg-fuchsia-50/50'}`;

    const cellIncome = (stripe, paid) =>
        dark
            ? `${tdBase} border-amber-500/10 text-right ${
                  paid
                      ? 'bg-emerald-500/15 font-semibold text-emerald-300 ring-1 ring-emerald-400/25'
                      : `${stripe ? 'bg-amber-950/35' : 'bg-amber-950/20'} text-amber-100`
              }`
            : `${tdBase} border-amber-100 text-right ${paid ? 'bg-emerald-50 font-semibold text-emerald-800' : `${stripe ? 'bg-amber-50' : 'bg-amber-50/60'} text-amber-900`}`;

    /**
     * Per-tier progress cell. By default shows the live count + a green check when
     * the side fully meets this tier. When `hideLiveData` is on, it shows the static
     * "X Panels" target instead (no live progress, no checkmark).
     */
    function progressCell(stripeFn, total, required, side, milestone) {
        if (hideLiveData) {
            return (
                <td className={stripeFn}>
                    <span className="tabular-nums">{milestone} Panels</span>
                </td>
            );
        }
        const live = Math.max(0, total | 0);
        const reached = live >= required && required > 0;
        return (
            <td className={stripeFn}>
                <span className={`inline-flex items-center gap-1 ${reached ? (side === 'L' ? 'text-cyan-100' : 'text-fuchsia-100') : ''}`}>
                    <span className="tabular-nums">{live}</span>
                    {reached ? (
                        <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    ) : null}
                </span>
            </td>
        );
    }

    let rows = null;
    let summary = null;

    if (variant === 'panel' && panelData) {
        const totalL = (panelData.total_left_subs ?? panelData.carry_left) | 0;
        const totalR = (panelData.total_right_subs ?? panelData.carry_right) | 0;
        const perPair = panelData.per_pair_income_usd;
        summary = {
            l: totalL,
            r: totalR,
            carryL: panelData.carry_left | 0,
            carryR: panelData.carry_right | 0,
        };
        rows = MILESTONES.map((m, i) => {
            const stripe = i % 2 === 1;
            const required = Math.max(1, m / 2);
            return (
                <tr key={m} className="transition-colors hover:bg-white/[0.04]">
                    <td className={cellMilestone(stripe)}>{m}</td>
                    {progressCell(cellL(stripe), totalL, required, 'L', m)}
                    {progressCell(cellR(stripe), totalR, required, 'R', m)}
                    <td className={cellIncome(stripe, false)}>
                        <span className="tabular-nums text-amber-200">{fmtUsd(perPair)}</span>
                    </td>
                </tr>
            );
        });
    } else if (variant === 'sub' && subData) {
        const totalL = (panelData?.total_left_subs ?? subData.total_left_subs ?? panelData?.carry_left ?? 0) | 0;
        const totalR = (panelData?.total_right_subs ?? subData.total_right_subs ?? panelData?.carry_right ?? 0) | 0;
        const currentMilestone = subData.current_milestone ?? 0;
        const tiers = subData.tier_rows ?? [];
        summary = {
            l: totalL,
            r: totalR,
            carryL: (panelData?.carry_left ?? 0) | 0,
            carryR: (panelData?.carry_right ?? 0) | 0,
            extraLabel2: 'Lapsed today',
            extraValue2: subData.today_weak_lapsed ?? 0,
        };
        rows = tiers.map((row, idx) => {
            const paid =
                !hideEarnedHighlight &&
                (row.matching_panels | 0) === (currentMilestone | 0) &&
                (currentMilestone | 0) > 0;
            const stripe = idx % 2 === 1;
            const required = Math.max(1, (row.matching_panels | 0) / 2);
            return (
                <tr key={row.matching_panels} className="transition-colors hover:bg-white/[0.04]">
                    <td className={cellMilestone(stripe)}>{row.matching_panels}</td>
                    {progressCell(cellL(stripe), totalL, required, 'L', row.matching_panels)}
                    {progressCell(cellR(stripe), totalR, required, 'R', row.matching_panels)}
                    <td className={cellIncome(stripe, paid)}>
                        <span className="tabular-nums">{fmtUsd(row.income_usd)}</span>
                        {paid ? (
                            <span
                                className={`ml-2 inline-block rounded-md bg-emerald-500/25 px-1.5 py-0.5 font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/40 ${comfortable ? 'text-[11px]' : 'text-[10px]'}`}
                            >
                                Paid
                            </span>
                        ) : null}
                    </td>
                </tr>
            );
        });
    } else if (variant === 'super' && superData) {
        const totalL = (superData.total_left_supers ?? superData.carry_left) | 0;
        const totalR = (superData.total_right_supers ?? superData.carry_right) | 0;
        const currentMilestone = superData.current_milestone ?? 0;
        const tiers = superData.tier_rows ?? [];
        summary = {
            l: totalL,
            r: totalR,
            carryL: superData.carry_left | 0,
            carryR: superData.carry_right | 0,
            extraLabel2: 'Lapsed today',
            extraValue2: superData.today_weak_lapsed ?? 0,
        };
        rows = tiers.map((row, idx) => {
            const paid =
                !hideEarnedHighlight &&
                (row.matching_panels | 0) === (currentMilestone | 0) &&
                (currentMilestone | 0) > 0;
            const stripe = idx % 2 === 1;
            const required = Math.max(1, (row.matching_panels | 0) / 2);
            return (
                <tr key={row.matching_panels} className="transition-colors hover:bg-white/[0.04]">
                    <td className={cellMilestone(stripe)}>{row.matching_panels}</td>
                    {progressCell(cellL(stripe), totalL, required, 'L', row.matching_panels)}
                    {progressCell(cellR(stripe), totalR, required, 'R', row.matching_panels)}
                    <td className={cellIncome(stripe, paid)}>
                        <span className="tabular-nums">{fmtUsd(row.income_usd)}</span>
                        {paid ? (
                            <span
                                className={`ml-2 inline-block rounded-md bg-emerald-500/25 px-1.5 py-0.5 font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/40 ${comfortable ? 'text-[11px]' : 'text-[10px]'}`}
                            >
                                Paid
                            </span>
                        ) : null}
                    </td>
                </tr>
            );
        });
    }

    if (!rows) {
        return null;
    }

    if (carryForwardOnly) {
        const carryCard = (side, value, tone) => (
            <div
                className={[
                    'rounded-2xl border px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
                    tone === 'left'
                        ? 'border-cyan-400/25 bg-cyan-500/10 text-cyan-100'
                        : 'border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100',
                ].join(' ')}
            >
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-75">{side}</p>
                <p className="mt-1 text-xs opacity-70">Carry Forward</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-white">{value ?? 0}</p>
            </div>
        );

        return (
            <div className={card}>
                <div className="grid grid-cols-2 gap-2">
                    {carryCard('Left', summary?.carryL ?? 0, 'left')}
                    {carryCard('Right', summary?.carryR ?? 0, 'right')}
                </div>
            </div>
        );
    }

    const summaryChipBase = dark
        ? 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs'
        : 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold text-slate-700 sm:text-xs';

    return (
        <div className={card}>
            {summary && !hideLiveData ? (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`${summaryChipBase} ${dark ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100' : 'border-cyan-300 bg-cyan-50'}`}>
                        <span className="opacity-70">Left:</span>
                        <span className="tabular-nums">{summary.l}</span>
                        <span className="opacity-50">·</span>
                        <span className="text-[10px] opacity-70">unmatched</span>
                        <span className="tabular-nums">{summary.carryL}</span>
                    </span>
                    <span className={`${summaryChipBase} ${dark ? 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100' : 'border-fuchsia-300 bg-fuchsia-50'}`}>
                        <span className="opacity-70">Right:</span>
                        <span className="tabular-nums">{summary.r}</span>
                        <span className="opacity-50">·</span>
                        <span className="text-[10px] opacity-70">unmatched</span>
                        <span className="tabular-nums">{summary.carryR}</span>
                    </span>
                    {summary.extraLabel2 ? (
                        <span className={`${summaryChipBase} ${dark ? 'border-rose-400/30 bg-rose-500/10 text-rose-100' : 'border-rose-300 bg-rose-50'}`}>
                            <span className="opacity-70">{summary.extraLabel2}:</span>
                            <span className="tabular-nums">{summary.extraValue2 ?? 0}</span>
                        </span>
                    ) : null}
                </div>
            ) : null}
            <div className={embedded ? 'overflow-x-auto' : 'overflow-x-auto rounded-xl ring-1 ring-white/10'}>
                <table className={`w-full min-w-[320px] border-collapse ${comfortable ? 'text-base' : 'text-sm'}`}>
                    <thead>
                        <tr>
                            <th className={`${thBase} rounded-tl-xl ${H.milestone}`}>{hideLiveData ? 'Match' : 'Panel match table'}</th>
                            <th className={`${thBase} text-center ${H.L}`}>{hideLiveData ? 'Left Panels' : 'L'}</th>
                            <th className={`${thBase} text-center ${H.R}`}>{hideLiveData ? 'Right Panels' : 'R'}</th>
                            <th className={`${thBase} rounded-tr-xl text-right ${H.income}`}>Income</th>
                        </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </table>
            </div>
        </div>
    );
}

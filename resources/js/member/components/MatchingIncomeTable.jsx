import { isCarryChipVisible, isPowerLegCarryVisible, matchingCarryDisplay, teamCarryForwardFromLegTotals } from '../lib/powerLegCarry';

/**
 * Shared 4-column milestone table: Panel match table | L | R | Income
 * Used by /member/panel-matching, sub-panel-matching, super-sub-panel-matching.
 */
export function MatchingIncomeTable({
    dark,
    variant,
    panelData,
    activeData,
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

    /** Milestone schedule always shows $; active panel may hide future tiers when locked. */
    function incomeCell(stripe, paid, amount, locked, scope = 'milestone') {
        if (scope === 'active' && locked && !paid) {
            return (
                <td className={cellIncome(stripe, false)}>
                    <span className="opacity-50">—</span>
                </td>
            );
        }
        const display = amount ?? '0.00';
        const highlight = paid && !hideEarnedHighlight;
        return (
            <td className={cellIncome(stripe, highlight)}>
                <span className="tabular-nums font-semibold">{fmtUsd(display)}</span>
                {highlight ? (
                    <span
                        className={`ml-2 inline-block rounded-md bg-emerald-500/25 px-1.5 py-0.5 font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/40 ${comfortable ? 'text-[11px]' : 'text-[10px]'}`}
                    >
                        Paid
                    </span>
                ) : null}
            </td>
        );
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

    if (variant === 'active' && activeData) {
        const totalL = (activeData.total_left_active_panels ?? 0) | 0;
        const totalR = (activeData.total_right_active_panels ?? 0) | 0;
        const perPair = activeData.per_pair_income_usd ?? '1.00';
        const maxPairs = (activeData.max_pairs_per_day ?? 20) | 0;
        const pairsPaid = (activeData.pairs_paid_today ?? activeData.pairs_matched_last_closing ?? 0) | 0;
        const incomeLocked = activeData.income_projection_locked === true;
        const carry = matchingCarryDisplay({
            eligible: activeData.eligible === true,
            carryLeft: activeData.carry_left,
            carryRight: activeData.carry_right,
            legLeft: totalL,
            legRight: totalR,
            closingLeftOut: activeData.today_left_carry_out,
            closingRightOut: activeData.today_right_carry_out,
        });
        const tiers = activeData.tier_rows ?? [];
        summary = {
            l: totalL,
            r: totalR,
            carryL: carry.left,
            carryR: carry.right,
            carryBilateral: activeData.eligible !== true,
            extraLabel2: 'Max pairs/day',
            extraValue2: maxPairs,
        };
        rows = tiers.map((row, idx) => {
            const pairNo = row.matching_panels | 0;
            const paid = !hideEarnedHighlight && pairNo > 0 && pairsPaid > 0 && pairNo === pairsPaid;
            const stripe = idx % 2 === 1;
            return (
                <tr key={pairNo} className="transition-colors hover:bg-white/[0.04]">
                    <td className={cellMilestone(stripe)}>
                        {pairNo} {pairNo === 1 ? 'pair' : 'pairs'}
                    </td>
                    {hideLiveData ? (
                        <>
                            <td className={cellL(stripe)}>
                                <span className="tabular-nums">1 L</span>
                            </td>
                            <td className={cellR(stripe)}>
                                <span className="tabular-nums">1 R</span>
                            </td>
                        </>
                    ) : (
                        <>
                            {progressCell(cellL(stripe), (activeData.carry_left ?? 0) | 0, pairNo, 'L', pairNo)}
                            {progressCell(cellR(stripe), (activeData.carry_right ?? 0) | 0, pairNo, 'R', pairNo)}
                        </>
                    )}
                    {incomeCell(stripe, paid, row.income_usd ?? perPair, incomeLocked, 'active')}
                </tr>
            );
        });
    } else if (variant === 'panel' && panelData) {
        const totalL = (panelData.total_left_subs ?? panelData.carry_left) | 0;
        const totalR = (panelData.total_right_subs ?? panelData.carry_right) | 0;
        const perPair = panelData.per_pair_income_usd;
        const carry = teamCarryForwardFromLegTotals(
            panelData.total_left_subs ?? panelData.carry_left,
            panelData.total_right_subs ?? panelData.carry_right,
        );
        summary = {
            l: totalL,
            r: totalR,
            carryL: carry.left,
            carryR: carry.right,
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
        const totalL = (subData.total_left_subs ?? 0) | 0;
        const totalR = (subData.total_right_subs ?? 0) | 0;
        const subEligible = subData.eligible === true;
        const currentMilestone = subData.current_milestone ?? 0;
        const incomeLocked = subData.income_projection_locked === true;
        const tiers = subData.tier_rows ?? [];
        const carry = matchingCarryDisplay({
            eligible: subEligible,
            carryLeft: subData.carry_left ?? panelData?.carry_left,
            carryRight: subData.carry_right ?? panelData?.carry_right,
            legLeft: totalL,
            legRight: totalR,
            closingLeftOut: subData.today_left_carry_out,
            closingRightOut: subData.today_right_carry_out,
        });
        summary = {
            l: totalL,
            r: totalR,
            carryL: carry.left,
            carryR: carry.right,
            carryBilateral: !subEligible,
            extraLabel2: 'Lapsed today',
            extraValue2: subData.today_weak_lapsed ?? 0,
        };
        const applicableTier = (currentMilestone | 0) > 0 ? currentMilestone | 0 : 0;
        rows = tiers.map((row, idx) => {
            const tier = row.matching_panels | 0;
            const paid =
                !hideEarnedHighlight &&
                tier === applicableTier &&
                applicableTier > 0;
            const isApplicable = tier === applicableTier && applicableTier > 0;
            const stripe = idx % 2 === 1;
            const required = Math.max(1, tier / 2);
            return (
                <tr
                    key={tier}
                    className={`transition-colors hover:bg-white/[0.04] ${isApplicable ? (dark ? 'ring-1 ring-inset ring-sky-400/45' : 'ring-1 ring-inset ring-sky-400/60') : ''}`}
                >
                    <td className={cellMilestone(stripe)}>
                        {tier}
                        {isApplicable ? (
                            <span
                                className={`ml-1.5 inline-block rounded-md px-1.5 py-0.5 font-bold uppercase tracking-wide ${dark ? 'bg-sky-500/25 text-sky-200 ring-1 ring-sky-400/40' : 'bg-sky-100 text-sky-800'} ${comfortable ? 'text-[10px]' : 'text-[9px]'}`}
                            >
                                Today
                            </span>
                        ) : null}
                    </td>
                    {progressCell(cellL(stripe), totalL, required, 'L', tier)}
                    {progressCell(cellR(stripe), totalR, required, 'R', tier)}
                    {incomeCell(stripe, paid, row.income_usd, incomeLocked, 'milestone')}
                </tr>
            );
        });
        summary = {
            ...summary,
            payoutBanner: {
                earned: subData.earned_today_usd,
                projected: subData.table_income_usd ?? subData.today_milestone_paid_usd,
                milestone: applicableTier,
                locked: incomeLocked,
                eligible: subEligible,
                maxPairs: subData.max_binary_pairs_per_day ?? 20,
            },
        };
    } else if (variant === 'super' && superData) {
        const totalL = (superData.total_left_supers ?? 0) | 0;
        const totalR = (superData.total_right_supers ?? 0) | 0;
        const superEligible = superData.eligible === true;
        const currentMilestone = superData.current_milestone ?? 0;
        const incomeLocked = superData.income_projection_locked === true;
        const tiers = superData.tier_rows ?? [];
        const carry = matchingCarryDisplay({
            eligible: superEligible,
            carryLeft: superData.carry_left,
            carryRight: superData.carry_right,
            legLeft: totalL,
            legRight: totalR,
            closingLeftOut: superData.today_left_carry_out,
            closingRightOut: superData.today_right_carry_out,
        });
        summary = {
            l: totalL,
            r: totalR,
            carryL: carry.left,
            carryR: carry.right,
            carryBilateral: !superEligible,
            extraLabel2: 'Lapsed today',
            extraValue2: superData.today_weak_lapsed ?? 0,
        };
        const applicableTier = (currentMilestone | 0) > 0 ? currentMilestone | 0 : 0;
        rows = tiers.map((row, idx) => {
            const tier = row.matching_panels | 0;
            const paid =
                !hideEarnedHighlight &&
                tier === applicableTier &&
                applicableTier > 0;
            const isApplicable = tier === applicableTier && applicableTier > 0;
            const stripe = idx % 2 === 1;
            const required = Math.max(1, tier / 2);
            return (
                <tr
                    key={tier}
                    className={`transition-colors hover:bg-white/[0.04] ${isApplicable ? (dark ? 'ring-1 ring-inset ring-amber-400/45' : 'ring-1 ring-inset ring-amber-400/60') : ''}`}
                >
                    <td className={cellMilestone(stripe)}>
                        {tier}
                        {isApplicable ? (
                            <span
                                className={`ml-1.5 inline-block rounded-md px-1.5 py-0.5 font-bold uppercase tracking-wide ${dark ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/40' : 'bg-amber-100 text-amber-800'} ${comfortable ? 'text-[10px]' : 'text-[9px]'}`}
                            >
                                Today
                            </span>
                        ) : null}
                    </td>
                    {progressCell(cellL(stripe), totalL, required, 'L', tier)}
                    {progressCell(cellR(stripe), totalR, required, 'R', tier)}
                    {incomeCell(stripe, paid, row.income_usd, incomeLocked, 'milestone')}
                </tr>
            );
        });
        summary = {
            ...summary,
            payoutBanner: {
                earned: superData.earned_today_usd,
                projected: superData.table_income_usd ?? superData.today_milestone_paid_usd,
                milestone: applicableTier,
                locked: incomeLocked,
                eligible: superEligible,
                maxPairs: superData.max_binary_pairs_per_day ?? 20,
            },
        };
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
                <div
                    className={
                        isPowerLegCarryVisible(summary?.carryL) && isPowerLegCarryVisible(summary?.carryR)
                            ? 'grid grid-cols-2 gap-2'
                            : 'grid max-w-[200px] grid-cols-1 gap-2'
                    }
                >
                    {isPowerLegCarryVisible(summary?.carryL) ? carryCard('Left', summary.carryL, 'left') : null}
                    {isPowerLegCarryVisible(summary?.carryR) ? carryCard('Right', summary.carryR, 'right') : null}
                </div>
            </div>
        );
    }

    const summaryChipBase = dark
        ? 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs'
        : 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold text-slate-700 sm:text-xs';

    const carryChipVisible = (side) =>
        isCarryChipVisible(side === 'L' ? summary?.carryL : summary?.carryR, {
            bilateral: summary?.carryBilateral === true,
        });

    const showCarrySummary =
        summary &&
        (!hideLiveData ||
            summary.carryBilateral ||
            isPowerLegCarryVisible(summary.carryL) ||
            isPowerLegCarryVisible(summary.carryR));

    const payoutBanner = summary?.payoutBanner;
    const bannerTone =
        variant === 'super'
            ? dark
                ? 'border-amber-400/35 bg-amber-500/15 text-amber-100'
                : 'border-amber-300 bg-amber-50 text-amber-900'
            : dark
              ? 'border-sky-400/35 bg-sky-500/15 text-sky-100'
              : 'border-sky-300 bg-sky-50 text-sky-900';

    return (
        <div className={card}>
            {payoutBanner ? (
                <div className={`mb-3 rounded-xl border px-3 py-2.5 text-sm leading-snug ${bannerTone}`}>
                    {!payoutBanner.eligible ? (
                        <p>Activate panel to earn sub-panel matching income.</p>
                    ) : payoutBanner.locked && Number.parseFloat(String(payoutBanner.earned)) > 0 ? (
                        <p>
                            <span className="font-bold">Paid this cycle:</span>{' '}
                            <span className="tabular-nums text-lg font-black">{fmtUsd(payoutBanner.earned)}</span>
                            {payoutBanner.milestone > 0 ? (
                                <span className="opacity-90">
                                    {' '}
                                    @ {payoutBanner.milestone} pairs tier (max {payoutBanner.maxPairs} pairs/day)
                                </span>
                            ) : null}
                        </p>
                    ) : payoutBanner.milestone > 0 ? (
                        <p>
                            <span className="font-bold">Today&apos;s tier income:</span>{' '}
                            <span className="tabular-nums text-lg font-black">{fmtUsd(payoutBanner.projected)}</span>
                            <span className="opacity-90">
                                {' '}
                                when {payoutBanner.milestone} pairs match (nearest lower milestone · max{' '}
                                {payoutBanner.maxPairs}/day)
                            </span>
                        </p>
                    ) : (
                        <p>Match at least 2 pairs on both legs to reach the first income tier ($2).</p>
                    )}
                </div>
            ) : null}
            {showCarrySummary ? (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    {!hideLiveData ? (
                    <span className={`${summaryChipBase} ${dark ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100' : 'border-cyan-300 bg-cyan-50'}`}>
                        <span className="opacity-70">Left:</span>
                        <span className="tabular-nums">{summary.l}</span>
                        {carryChipVisible('L') ? (
                            <>
                                <span className="opacity-50">·</span>
                                <span className="text-[10px] opacity-70">carry</span>
                                <span className="tabular-nums">{summary.carryL}</span>
                            </>
                        ) : null}
                    </span>
                    ) : null}
                    {!hideLiveData ? (
                    <span className={`${summaryChipBase} ${dark ? 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100' : 'border-fuchsia-300 bg-fuchsia-50'}`}>
                        <span className="opacity-70">Right:</span>
                        <span className="tabular-nums">{summary.r}</span>
                        {carryChipVisible('R') ? (
                            <>
                                <span className="opacity-50">·</span>
                                <span className="text-[10px] opacity-70">carry</span>
                                <span className="tabular-nums">{summary.carryR}</span>
                            </>
                        ) : null}
                    </span>
                    ) : null}
                    {hideLiveData && carryChipVisible('L') ? (
                        <span className={`${summaryChipBase} ${dark ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100' : 'border-cyan-300 bg-cyan-50'}`}>
                            <span className="opacity-70">Left carry:</span>
                            <span className="tabular-nums">{summary.carryL}</span>
                        </span>
                    ) : null}
                    {hideLiveData && carryChipVisible('R') ? (
                        <span className={`${summaryChipBase} ${dark ? 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100' : 'border-fuchsia-300 bg-fuchsia-50'}`}>
                            <span className="opacity-70">Right carry:</span>
                            <span className="tabular-nums">{summary.carryR}</span>
                        </span>
                    ) : null}
                    {!hideLiveData && summary.extraLabel2 ? (
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
                            <th className={`${thBase} rounded-tl-xl ${H.milestone}`}>
                                {variant === 'active'
                                    ? hideLiveData
                                        ? 'Pairs / day'
                                        : 'Pairs (max 20/day)'
                                    : hideLiveData
                                      ? 'Match'
                                      : 'Panel match table'}
                            </th>
                            <th className={`${thBase} text-center ${H.L}`}>{hideLiveData ? 'Left Panels' : 'L'}</th>
                            <th className={`${thBase} text-center ${H.R}`}>{hideLiveData ? 'Right Panels' : 'R'}</th>
                            <th className={`${thBase} rounded-tr-xl text-right ${H.income}`}>
                                {variant === 'sub' || variant === 'super' ? 'Income ($)' : 'Income'}
                            </th>
                        </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </table>
            </div>
        </div>
    );
}

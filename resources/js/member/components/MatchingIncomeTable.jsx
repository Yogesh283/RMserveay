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

    let rows = null;

    if (variant === 'panel' && panelData) {
        const L = panelData.carry_left ?? 0;
        const R = panelData.carry_right ?? 0;
        const perPair = panelData.per_pair_income_usd;
        rows = MILESTONES.map((m, i) => {
            const stripe = i % 2 === 1;
            return (
                <tr key={m} className="transition-colors hover:bg-white/[0.04]">
                    <td className={cellMilestone(stripe)}>{m}</td>
                    <td className={cellL(stripe)}>{L}</td>
                    <td className={cellR(stripe)}>{R}</td>
                    <td className={cellIncome(stripe, false)}>
                        <span className="tabular-nums text-amber-200">{fmtUsd(perPair)}</span>
                    </td>
                </tr>
            );
        });
    } else if (variant === 'sub' && panelData && subData) {
        const L = panelData.carry_left ?? 0;
        const R = panelData.carry_right ?? 0;
        const mask = subData.milestones_hit_mask ?? 0;
        const tiers = subData.tier_rows ?? [];
        rows = tiers.map((row, idx) => {
            const paid = tierPaid(mask, idx);
            const stripe = idx % 2 === 1;
            return (
                <tr key={row.matching_panels} className="transition-colors hover:bg-white/[0.04]">
                    <td className={cellMilestone(stripe)}>{row.matching_panels}</td>
                    <td className={cellL(stripe)}>{L}</td>
                    <td className={cellR(stripe)}>{R}</td>
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
        const L = superData.carry_left ?? 0;
        const R = superData.carry_right ?? 0;
        const mask = superData.milestones_hit_mask ?? 0;
        const tiers = superData.tier_rows ?? [];
        rows = tiers.map((row, idx) => {
            const paid = tierPaid(mask, idx);
            const stripe = idx % 2 === 1;
            return (
                <tr key={row.matching_panels} className="transition-colors hover:bg-white/[0.04]">
                    <td className={cellMilestone(stripe)}>{row.matching_panels}</td>
                    <td className={cellL(stripe)}>{L}</td>
                    <td className={cellR(stripe)}>{R}</td>
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

    return (
        <div className={card}>
            <div className={embedded ? 'overflow-x-auto' : 'overflow-x-auto rounded-xl ring-1 ring-white/10'}>
                <table className={`w-full min-w-[320px] border-collapse ${comfortable ? 'text-base' : 'text-sm'}`}>
                    <thead>
                        <tr>
                            <th className={`${thBase} rounded-tl-xl ${H.milestone}`}>Panel match table</th>
                            <th className={`${thBase} text-center ${H.L}`}>L</th>
                            <th className={`${thBase} text-center ${H.R}`}>R</th>
                            <th className={`${thBase} rounded-tr-xl text-right ${H.income}`}>Income</th>
                        </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </table>
            </div>
        </div>
    );
}

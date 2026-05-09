import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MemberHeading, MemberNote, MemberP, MemberSubheading, MemberUl } from '../components/MemberTypography';

const PRIMARY = '#059669';

const badgeOk =
    'inline-flex shrink-0 items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500 ring-1 ring-emerald-500/30 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/25';

const badgeNo =
    'inline-flex shrink-0 items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 ring-1 ring-amber-500/30 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/25';

function fmtUsd(s) {
    const n = Number.parseFloat(s);
    if (Number.isNaN(n)) return s;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtDateTime(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        const datePart = d.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${datePart} ${timePart}`;
    } catch {
        return '—';
    }
}

export default function MemberLevelIncomePage() {
    const { dark } = useOutletContext();
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [txData, setTxData] = useState(null);
    const [txError, setTxError] = useState(null);
    const [txLoading, setTxLoading] = useState(true);

    const load = useCallback(async () => {
        setLoadError(null);
        try {
            const { data: json } = await window.axios.get('api/member/programme/level-income');
            setData(json);
        } catch (e) {
            setLoadError(e.response?.data?.message ?? e.message ?? 'Failed to load');
        }
    }, []);

    const loadTransactions = useCallback(async () => {
        setTxError(null);
        setTxLoading(true);
        try {
            const { data: json } = await window.axios.get('api/member/programme/level-income/transactions?limit=100');
            setTxData(json);
        } catch (e) {
            setTxError(e.response?.data?.message ?? e.message ?? 'Failed to load transactions');
            setTxData(null);
        } finally {
            setTxLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        loadTransactions();
    }, [load, loadTransactions]);

    const maxBar = useMemo(() => {
        if (!data?.levels?.length) return 1;
        let m = 0;
        for (const row of data.levels) {
            const v = Number.parseFloat(row.earned_today_usd);
            if (!Number.isNaN(v)) m = Math.max(m, v);
        }
        return m > 0 ? m : 1;
    }, [data]);

    const card = `rounded-xl border p-6 ${dark ? 'border-white/10 bg-[#1e293b]' : 'border-gray-200 bg-white'} shadow-sm`;

    return (
        <div className="space-y-8">
            {/* Hero */}
            <div
                className={`relative overflow-hidden rounded-2xl border p-8 ${dark ? 'border-emerald-500/20 bg-gradient-to-br from-emerald-950/80 via-[#1e293b] to-slate-900' : 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50'}`}
            >
                <div
                    className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40 blur-3xl"
                    style={{ background: `${PRIMARY}66` }}
                />
                <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>RM Survey</p>
                <MemberHeading dark={dark}>Survey Level Income (10 Level Income)</MemberHeading>
                <MemberP dark={dark}>
                    <span className="block font-medium text-[15px]">What is Survey Level Income?</span>
                    When your <strong>direct team</strong> and their <strong>downline</strong> complete surveys and earn survey income, each generation in your{' '}
                    <strong>sponsor chain</strong> can receive <strong>1%</strong> of that credit — up to <strong>10 levels</strong>. The server distributes this automatically on
                    each <code className="rounded bg-black/10 px-1 py-0.5 text-xs dark:bg-white/10">survey_credit</code> event.
                </MemberP>
                {data && (
                    <div className="mt-6 flex flex-wrap items-end gap-6">
                        <div>
                            <p className={`text-xs uppercase tracking-wide ${dark ? 'text-emerald-400/90' : 'text-emerald-700'}`}>Today (all levels)</p>
                            <p className={`text-3xl font-bold tabular-nums ${dark ? 'text-white' : 'text-gray-900'}`}>{fmtUsd(data.earned_today_usd)}</p>
                        </div>
                        <span className={data.eligible ? badgeOk : badgeNo}>{data.eligible ? 'Eligible — receiving payouts' : 'Payee: active panelist required'}</span>
                    </div>
                )}
            </div>

            {loadError && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${dark ? 'border-red-400/40 bg-red-950/40 text-red-200' : 'border-red-200 bg-red-50 text-red-800'}`}>
                    {loadError}
                </div>
            )}

            {/* Live level chart */}
            {data && (
                <section className={card}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <MemberSubheading dark={dark}>Level-wise income chart (live · today)</MemberSubheading>
                        <span className={`text-sm font-medium ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>{data.rate_percent_per_level}% / level</span>
                    </div>
                    <p className={`mt-1 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{data.eligible_hint}</p>

                    <div className="mt-6 space-y-3">
                        {data.levels.map((row) => {
                            const amt = Number.parseFloat(row.earned_today_usd);
                            const pct = Number.isNaN(amt) ? 0 : Math.min(100, (amt / maxBar) * 100);
                            return (
                                <div key={row.level}>
                                    <div className="mb-1 flex justify-between text-sm">
                                        <span className={`font-medium ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                                            Level {row.level}
                                            <span className={`ml-2 font-normal ${dark ? 'text-gray-500' : 'text-gray-500'}`}>({row.percent}%)</span>
                                        </span>
                                        <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{fmtUsd(row.earned_today_usd)}</span>
                                    </div>
                                    <div className={`h-2 overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-gray-200'}`}>
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-[width] duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Recent level income transactions (live wallet credits) */}
            <section className={card}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <MemberSubheading dark={dark}>Recent level income transactions</MemberSubheading>
                    <div className="flex items-center gap-2">
                        {txData ? (
                            <span className={`text-sm font-medium tabular-nums ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                Lifetime: {fmtUsd(txData.lifetime_total_usd)}
                            </span>
                        ) : null}
                        <button
                            type="button"
                            onClick={loadTransactions}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                                dark
                                    ? 'border-white/10 bg-white/[0.04] text-white hover:border-emerald-400/40'
                                    : 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400'
                            }`}
                            disabled={txLoading}
                        >
                            {txLoading ? 'Loading…' : 'Refresh'}
                        </button>
                    </div>
                </div>
                <p className={`mt-1 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Aapke 10-level upline chain se mile har survey credit ka 1% commission. Last 100 entries dikh rahi hain.
                </p>

                {txError ? (
                    <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${dark ? 'border-red-400/40 bg-red-950/40 text-red-200' : 'border-red-200 bg-red-50 text-red-800'}`}>
                        {txError}
                    </div>
                ) : null}

                {!txError && txData && txData.transactions.length === 0 ? (
                    <div className={`mt-4 rounded-lg border px-4 py-6 text-center text-sm ${dark ? 'border-white/10 bg-white/[0.03] text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                        Abhi tak koi level income credit nahi mila. Jab aapki team survey complete karegi, yahan rows dikhne lagengi.
                    </div>
                ) : null}

                {!txError && txData && txData.transactions.length > 0 ? (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-white/5">
                        <table className="w-full min-w-[640px] border-collapse text-sm">
                            <thead>
                                <tr className={dark ? 'bg-white/[0.04] text-emerald-300' : 'bg-emerald-50 text-emerald-700'}>
                                    <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide">Date</th>
                                    <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide">Level</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide">From</th>
                                    <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide">Base</th>
                                    <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide">Rate</th>
                                    <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide">Earned</th>
                                </tr>
                            </thead>
                            <tbody>
                                {txData.transactions.map((row) => (
                                    <tr
                                        key={row.id}
                                        className={`border-t ${dark ? 'border-white/5 hover:bg-white/[0.03]' : 'border-gray-100 hover:bg-emerald-50/40'}`}
                                    >
                                        <td className={`px-3 py-2 tabular-nums text-[12px] ${dark ? 'text-gray-300' : 'text-gray-800'}`}>
                                            {fmtDateTime(row.created_at)}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span
                                                className={`inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-md px-1.5 text-xs font-bold ${
                                                    dark
                                                        ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30'
                                                        : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                                                }`}
                                            >
                                                L{row.level}
                                            </span>
                                        </td>
                                        <td className={`px-3 py-2 ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-semibold">Member</span>
                                                {row.from_user_id ? (
                                                    <span className={`text-[10px] ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                        #{row.from_user_id}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className={`px-3 py-2 text-right tabular-nums text-[12px] ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {fmtUsd(row.base_survey_usd)}
                                        </td>
                                        <td className={`px-3 py-2 text-right tabular-nums text-[12px] ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {row.rate_percent}%
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <span className={`tabular-nums text-sm font-bold ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                                {fmtUsd(row.amount_usd)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {txData.total_count > txData.shown_count ? (
                            <div className={`px-3 py-2 text-right text-[11px] ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
                                Showing latest {txData.shown_count} of {txData.total_count} entries
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </section>

            <section className={card}>
                <MemberSubheading dark={dark}>Income structure</MemberSubheading>
                <MemberUl
                    dark={dark}
                    items={[
                        `Total Levels: ${data?.total_levels ?? 10}`,
                        `Income: ${data?.rate_percent_per_level ?? 1}% per Level (same base survey credit)`,
                        'Total Benefit: 10 generations deep on sponsor chain',
                    ]}
                />
            </section>

            <section className={card}>
                <MemberSubheading dark={dark}>How it works</MemberSubheading>
                <MemberUl
                    dark={dark}
                    items={[
                        'You refer people directly (referral / sponsor)',
                        'Their team completes surveys → survey wallet credits are created',
                        'On each credit, level 1 sponsor earns 1%, then their sponsor 1%, up to 10 levels',
                    ]}
                />
            </section>

            <section className={`rounded-xl border p-6 ${dark ? 'border-white/10 bg-[#1e293b]' : 'border-emerald-100 bg-emerald-50/50'} shadow-sm`}>
                <MemberSubheading dark={dark}>Example</MemberSubheading>
                <MemberP dark={dark}>
                    If your team generates a <strong>$100</strong> survey credit, each qualifying upline may receive <strong>1% ($1)</strong> at their level when
                    eligible — up to roughly <strong>10%</strong> of that credit when a full 10-level chain exists.
                </MemberP>
            </section>

            <MemberNote dark={dark}>
                <strong className="block">Key benefit</strong>
                <MemberUl dark={dark} items={['Passive depth up to 10 levels', 'Income grows as your team grows']} />
                <MemberP dark={dark}>
                    <strong>Important:</strong> Payouts depend on survey earnings. If a upline is not an active panelist, their payout may be skipped while the chain continues.
                </MemberP>
                <MemberP dark={dark}>
                    <strong>Summary:</strong> Survey Level Income = 10 levels × 1% per level on team survey earnings (see live breakdown above).
                </MemberP>
            </MemberNote>
        </div>
    );
}

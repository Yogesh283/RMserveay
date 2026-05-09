import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { prepareSanctum } from '../../lib/auth';
import { RmsCard } from '../components/rms';

function fmtUsd(s) {
    const n = Number.parseFloat(String(s));
    if (Number.isNaN(n)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

/** Slide-style: blue circle, document + dollar */
function IconEntryFee() {
    return (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-md ring-4 ring-sky-500/25">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M14 2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7l-5-5Z" />
                <path d="M14 2v5h5M10 12h4M10 16h4" strokeLinecap="round" />
                <path d="M12 8v4l2 2" strokeLinecap="round" />
            </svg>
        </span>
    );
}

/** Slide-style: orange circle, group of users */
function IconMaxPanels() {
    return (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-md ring-4 ring-orange-400/25">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M8 11a2.5 2.5 0 1 0-2.5-2.5A2.5 2.5 0 0 0 8 11Z" />
                <path d="M16 11a2.5 2.5 0 1 0-2.5-2.5A2.5 2.5 0 0 0 16 11Z" />
                <path d="M2 20.5c.8-2.2 2.6-3.5 4.5-3.5M22 20.5c-.8-2.2-2.6-3.5-4.5-3.5" strokeLinecap="round" />
                <path d="M12 11a2.5 2.5 0 1 0-2.5-2.5A2.5 2.5 0 0 0 12 11Z" />
            </svg>
        </span>
    );
}

export default function MemberSubPanelsPage() {
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState(null);

    const load = useCallback(async () => {
        setLoadError(null);
        try {
            await prepareSanctum();
            const { data: json } = await window.axios.get('api/member/programme/self-survey');
            setData(json);
        } catch (e) {
            setLoadError(e.response?.data?.message ?? e.message ?? 'Failed to load programme');
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function postSubPanel() {
        setActionError(null);
        setBusy(true);
        try {
            await prepareSanctum();
            const { data: json } = await window.axios.post('api/member/programme/self-survey/sub-panel');
            setData(json);
        } catch (e) {
            const msg = e.response?.data?.message ?? e.message ?? 'Request failed';
            setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setBusy(false);
        }
    }

    const maxSub = data?.limits?.sub_panels_max ?? 9;
    const eachSub =
        data?.fees?.sub_panel_per_survey_each_usd != null ? Number.parseFloat(data.fees.sub_panel_per_survey_each_usd) : 1;
    const panelFeeNum =
        data?.fees?.sub_panel_usd != null ? Number.parseFloat(String(data.fees.sub_panel_usd)) : 10;
    const safePanelFee = Number.isNaN(panelFeeNum) ? 10 : panelFeeNum;
    const maxEntryTotal = safePanelFee * maxSub;
    const entryFee = fmtUsd(safePanelFee.toFixed(2));
    const maxEntryLabel = fmtUsd(maxEntryTotal.toFixed(2));
    const count = data?.sub_panel_count ?? 0;
    const qualified = data?.active_panelist_qualified ?? false;
    const nextSlot = count + 1;
    const canBuyNext = qualified && count < maxSub && !busy;

    return (
        <div className="relative mx-auto max-w-5xl space-y-4">
            <div className="pointer-events-none absolute -top-10 right-0 h-44 w-44 rounded-full bg-violet-600/20 blur-[95px]" />
            <div className="pointer-events-none absolute top-44 left-2 h-40 w-40 rounded-full bg-fuchsia-500/14 blur-[84px]" />
            <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-200/75">RM Survey</p>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    <span className="text-white">Sub panel </span>
                    <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Income</span>
                </h1>
                <p className="text-xs text-[#94A3B8]">Upgrade slots, grow survey-tier earnings, and scale faster.</p>
            </div>



            <RmsCard variant="neon" className="!rounded-[22px] !border-violet-300/25 !bg-[#0b1020]/80 !p-3.5 shadow-[0_0_30px_rgba(139,92,246,0.14)] sm:!p-4">
                        <h2 className="text-base font-bold text-white">Buy package slots</h2>
                        <ul className="mt-3.5 grid list-none grid-cols-2 gap-2 sm:grid-cols-3">
                            {Array.from({ length: maxSub }, (_, i) => i + 1).map((n) => {
                                const owned = n <= count;
                                const isNext = n === nextSlot;
                                const locked = n > nextSlot;

                                return (
                                    <li
                                        key={n}
                                        className={[
                                            'rounded-xl border px-2.5 py-3 transition',
                                            owned
                                                ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                                                : isNext && canBuyNext
                                                  ? 'border-amber-400/40 bg-amber-500/10 ring-1 ring-amber-400/25'
                                                  : 'border-white/[0.07] bg-white/[0.02]',
                                            locked ? 'opacity-[0.72]' : '',
                                        ].join(' ')}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-[11px] font-semibold uppercase text-white/75">#{n}</span>
                                            {owned ? (
                                                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                                                    Active
                                                </span>
                                            ) : locked ? (
                                                <span className="text-[9px] uppercase text-white/35">Locked</span>
                                            ) : (
                                                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-200">
                                                    Next
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-2 text-lg font-bold tabular-nums text-violet-300">
                                            {fmtUsd((n * safePanelFee).toFixed(2))}
                                        </p>
                                        <p className="mt-0.5 text-[11px] tabular-nums text-white/45">
                                            package entry · +{fmtUsd((n * eachSub).toFixed(2))}{' '}
                                            <span className="text-white/35">/survey</span>
                                        </p>
                                        {isNext && !owned ? (
                                            <button
                                                type="button"
                                                disabled={!canBuyNext || !qualified}
                                                onClick={() => postSubPanel()}
                                                className="mt-3 w-full rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 py-2 text-xs font-semibold text-white shadow-md shadow-violet-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {qualified ? `Upgrade ${fmtUsd(data.fees.sub_panel_usd)}` : 'Locked'}
                                            </button>
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ul>
                        {count >= maxSub ? (
                            <p className="mt-4 text-center text-sm font-medium text-emerald-400">Full package — all {maxSub} panels active.</p>
                        ) : null}
                    </RmsCard>

            {loadError ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{loadError}</p>
            ) : null}
            {actionError ? <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{actionError}</p> : null}

            {!qualified && data ? (
                <p className="rounded-xl border border-amber-500/25 bg-amber-950/30 px-3.5 py-2.5 text-sm text-amber-100">
                    Complete{' '}
                    <Link to="/member/active-panels" className="font-semibold text-amber-300 underline underline-offset-2 hover:text-white">
                        active panelist
                    </Link>{' '}
                    fees before purchasing this package slots.
                </p>
            ) : null}

            {data ? (
                <>
                    {/* Package — matches pitch infographic (rules + diagram + table) */}
                    <section aria-labelledby="sub-package-heading">
                        <h2 id="sub-package-heading" className="sr-only">
                            Sub panel income package
                        </h2>
                        <div className="relative overflow-hidden rounded-[24px] border border-violet-400/28 bg-[#0d1629] shadow-[0_0_52px_-12px_rgba(139,92,246,0.2)]">
                            {/* subtle grid like slide */}
                            <div
                                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                                style={{
                                    backgroundImage:
                                        'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                                    backgroundSize: '20px 20px',
                                }}
                            />
                            <div className="relative border-b border-white/[0.08] bg-gradient-to-r from-[#1e3a5f] via-[#1a1040] to-[#0f2847] px-4 py-3.5 sm:px-5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">Package</p>
                                <p className="mt-1 text-lg font-bold text-white">
                                    Sub panel income <span className="text-violet-300">structure</span>
                                </p>
                             
                            </div>

                            <div className="relative grid lg:grid-cols-1 lg:gap-0">
                                {/* Income structure table */}
                                <div className="flex flex-col bg-black/20">
                                    <div className="border-b border-[#1e3a5f]/90 bg-[#1e3a5f] px-4 py-2.5 sm:px-5">
                                        <p className="text-sm font-bold tracking-tight text-white">Income structure:</p>
                                    </div>
                                    <div className="flex-1 overflow-x-auto">
                                        <table className="w-full min-w-[280px] border-collapse text-sm">
                                            <thead>
                                                <tr>
                                                    <th className="bg-orange-500 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-white sm:text-[11px]">
                                                        Sub panels
                                                    </th>
                                                    <th className="bg-[#152f52] px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-white sm:text-[11px]">
                                                        Total entry
                                                    </th>
                                                    <th className="bg-[#1e3a5f] px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-white sm:text-[11px]">
                                                        Income / survey
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white/[0.03]">
                                                {Array.from({ length: maxSub }, (_, i) => i + 1).map((n) => (
                                                    <tr key={n} className="border-t border-white/[0.06]">
                                                        <td className="px-3 py-2.5 text-white/90 sm:px-4">
                                                            {n} sub panel{n !== 1 ? 's' : ''}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right sm:px-4">
                                                            <span className="font-semibold tabular-nums text-sky-200">
                                                                {fmtUsd((n * safePanelFee).toFixed(2))}
                                                            </span>
                                                            <span className="hidden text-[10px] text-white/40 sm:inline"> paid</span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right sm:px-4">
                                                            <span className="font-bold tabular-nums text-violet-300">
                                                                {fmtUsd((n * eachSub).toFixed(2))}
                                                            </span>
                                                            <span className="text-xs font-medium text-white/55"> /survey</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="border-t border-white/[0.06] px-4 py-2.5 text-[10px] leading-relaxed text-white/45 sm:px-5">
                                        Total entry = panels × {entryFee} ({entryFee} … {maxEntryLabel}). Sub-tier survey income only; full pay may
                                        include other tiers.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Action slots */}

                </>
            ) : (
                !loadError && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/60">Loading…</div>
                )
            )}
        </div>
    );
}

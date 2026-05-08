import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { prepareSanctum } from '../../lib/auth';
import { RmsCard } from '../components/rms';

function fmtUsd(s) {
    const n = Number.parseFloat(String(s));
    if (Number.isNaN(n)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

/** Slide: wallet + entry */
function IconWalletEntry() {
    return (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-md ring-4 ring-violet-500/25">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
                <path d="M16 12h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2M16 12V9" strokeLinecap="round" />
                <circle cx="17" cy="15" r="1" fill="currentColor" />
            </svg>
        </span>
    );
}

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

export default function MemberSuperSubPanelsPage() {
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

    async function postSuperSubPanel() {
        setActionError(null);
        setBusy(true);
        try {
            await prepareSanctum();
            const { data: json } = await window.axios.post('api/member/programme/self-survey/super-sub-panel');
            setData(json);
        } catch (e) {
            const msg = e.response?.data?.message ?? e.message ?? 'Request failed';
            setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setBusy(false);
        }
    }

    const maxSuper = data?.limits?.super_sub_panels_max ?? 9;
    const eachSuperRaw =
        data?.fees?.super_sub_panel_per_survey_each_usd != null
            ? Number.parseFloat(data.fees.super_sub_panel_per_survey_each_usd)
            : 100;
    const eachSuper = Number.isNaN(eachSuperRaw) ? 100 : eachSuperRaw;
    const panelFeeNum =
        data?.fees?.super_sub_panel_usd != null ? Number.parseFloat(String(data.fees.super_sub_panel_usd)) : 100;
    const safePanelFee = Number.isNaN(panelFeeNum) ? 100 : panelFeeNum;
    const maxEntryTotal = safePanelFee * maxSuper;
    const entryFee = fmtUsd(safePanelFee.toFixed(2));
    const maxEntryLabel = fmtUsd(maxEntryTotal.toFixed(2));
    const count = data?.super_sub_panel_count ?? 0;
    const qualified = data?.active_panelist_qualified ?? false;
    const nextSlot = count + 1;
    const canBuyNext = qualified && count < maxSuper && !busy;

    return (
        <div className="relative mx-auto max-w-5xl space-y-4">
            <div className="pointer-events-none absolute -top-10 right-0 h-44 w-44 rounded-full bg-violet-600/20 blur-[95px]" />
            <div className="pointer-events-none absolute top-44 left-2 h-40 w-40 rounded-full bg-fuchsia-500/14 blur-[84px]" />
            <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-200/75">RM Survey</p>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    <span className="text-white">Super panel </span>
                    <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Income</span>
                </h1>
                <p className="text-xs text-[#94A3B8]">Premium tier slots for maximum per-survey rewards and matching growth.</p>
            </div>

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
                    fees first. Also see{' '}
                    <Link to="/member/sub-panels" className="font-semibold text-sky-300 underline underline-offset-2 hover:text-white">
                        sub panels
                    </Link>
                    .
                </p>
            ) : null}

            {data ? (
                <>
                    <section aria-labelledby="super-package-heading">
                        <h2 id="super-package-heading" className="sr-only">
                            Super panel income package
                        </h2>
                        <div className="relative overflow-hidden rounded-[24px] border border-violet-500/28 bg-[#0d1629] shadow-[0_0_56px_-12px_rgba(139,92,246,0.2)]">
                            <div
                                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                                style={{
                                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                                    backgroundSize: '20px 20px',
                                }}
                            />
                            <div className="relative border-b border-white/[0.08] bg-gradient-to-r from-[#1e3a5f] via-[#1a1040] to-[#0f2847] px-4 py-3.5 sm:px-5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">Package</p>
                                <p className="mt-1 text-lg font-bold text-white">
                                    Super panel <span className="text-fuchsia-300">structure</span>
                                </p>
                            </div>

                            <div className="relative grid lg:grid-cols-[1fr_1fr] xl:grid-cols-[1.2fr_1fr_280px] lg:gap-0">
                                <div className="space-y-4 border-white/[0.06] p-4 sm:p-5 lg:border-r xl:border-r">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3.5 shadow-lg shadow-black/25">
                                            <IconWalletEntry />
                                            <div>
                                                <p className="text-xs font-medium text-slate-600">Entry fee</p>
                                                <p className="mt-0.5 text-base font-bold text-slate-900">
                                                    <span className="tabular-nums text-orange-500">{entryFee}</span>
                                                    <span className="text-sm font-semibold text-slate-600"> (per panel)</span>
                                                </p>
                                                <p className="mt-1 text-[11px] text-slate-500">
                                                    Build from {entryFee} to <span className="font-semibold text-slate-700">{maxEntryLabel}</span>{' '}
                                                    ({maxSuper} panels)
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3.5 shadow-lg shadow-black/25">
                                            <IconMaxPanels />
                                            <div>
                                                <p className="text-xs font-medium text-slate-600">Maximum panels</p>
                                                <p className="mt-0.5 text-base font-bold text-slate-900">
                                                    <span className="text-orange-500">{maxSuper} super panels</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Panel tree</p>
                                        <div className="relative mt-3.5 flex flex-col items-center">
                                            <div className="relative z-[1] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-[#1e3a5f] text-sm font-bold text-white shadow-xl ring-4 ring-violet-400/30">
                                                You
                                            </div>
                                            <div className="relative -mt-1 flex h-10 w-[85%] max-w-md justify-around border-t border-dashed border-white/25 pt-2">
                                                <span className="absolute -top-px left-1/2 h-5 w-px -translate-x-1/2 border-l border-dashed border-white/25" />
                                            </div>
                                            <div className="-mt-2 flex max-w-full flex-wrap justify-center gap-1.5 px-1">
                                                {Array.from({ length: maxSuper }, (_, i) => i + 1).map((n) => {
                                                    const altBlue = n % 2 === 1;
                                                    const active = n <= count;
                                                    const isNext = n === nextSlot && qualified;
                                                    return (
                                                        <div
                                                            key={n}
                                                            className={[
                                                                'flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-bold tabular-nums shadow-md ring-2 transition',
                                                                active
                                                                    ? 'bg-emerald-500 text-white ring-emerald-300/50'
                                                                    : isNext
                                                                      ? 'bg-amber-400 text-slate-900 ring-amber-200'
                                                                      : altBlue
                                                                        ? 'bg-sky-600/90 text-white ring-sky-400/40'
                                                                        : 'bg-orange-500/90 text-white ring-orange-300/40',
                                                                !active && !isNext ? 'opacity-80' : '',
                                                            ].join(' ')}
                                                            title={`Super panel ${n}`}
                                                        >
                                                            {n}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <p className="mt-4 text-center text-[11px] text-white/45">More panels → more surveys → more income</p>
                                    </div>

                                    <p className="text-center text-xs text-white/50">
                                        Wallet{' '}
                                        <span className="font-semibold tabular-nums text-white">{fmtUsd(data.wallet_balance)}</span>
                                        <span className="mx-2 text-white/30">·</span>
                                        <Link
                                            to="/member/wallet/deposit"
                                            className="font-medium text-violet-300 underline-offset-2 hover:text-violet-200 hover:underline"
                                        >
                                            Add funds
                                        </Link>
                                    </p>
                                </div>

                                <div className="flex flex-col border-t border-white/[0.06] bg-black/20 lg:border-t-0 xl:border-r xl:border-t-0">
                                    <div className="border-b border-[#1e3a5f]/90 bg-[#1e3a5f] px-4 py-2.5 sm:px-5">
                                        <p className="text-sm font-bold tracking-tight text-white">Income structure:</p>
                                    </div>
                                    <div className="flex-1 overflow-x-auto">
                                        <table className="w-full min-w-[280px] border-collapse text-sm">
                                            <thead>
                                                <tr>
                                                    <th className="bg-orange-500 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-white sm:text-[11px]">
                                                        Super panels
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
                                                {Array.from({ length: maxSuper }, (_, i) => i + 1).map((n) => (
                                                    <tr key={n} className="border-t border-white/[0.06]">
                                                        <td className="px-3 py-2.5 text-white/90 sm:px-4">
                                                            {n} super panel{n !== 1 ? 's' : ''}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right sm:px-4">
                                                            <span className="font-semibold tabular-nums text-sky-200">
                                                                {fmtUsd((n * safePanelFee).toFixed(2))}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right sm:px-4">
                                                            <span className="font-bold tabular-nums text-fuchsia-300">
                                                                {fmtUsd((n * eachSuper).toFixed(2))}
                                                            </span>
                                                            <span className="text-xs font-medium text-white/55"> /survey</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="border-t border-white/[0.06] px-4 py-2.5 text-[10px] leading-relaxed text-white/45 sm:px-5">
                                        Total entry = panels × {entryFee} ({entryFee} … {maxEntryLabel}). Super-tier survey strip; full self-survey
                                        pay adds panelist + active + sub + super.
                                    </p>
                                </div>

                                <div className="space-y-3 border-t border-white/[0.06] p-3.5 sm:p-4 xl:border-t-0">
                                    <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Important notes</p>
                                        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[11px] text-white/70">
                                            <li>Max 9 panels each on Sub panels and Super panels.</li>
                                            <li>More panels mean higher tier income on completed surveys.</li>
                                            <li>All earnings depend on completing surveys.</li>
                                        </ul>
                                    </div>
                                    <div className="rounded-2xl border border-orange-500/25 bg-orange-950/20 p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300">Conclusion</p>
                                        <p className="mt-2 text-[11px] leading-relaxed text-white/75">
                                            Self survey income = panelist + active + <Link to="/member/sub-panels" className="text-sky-400 underline">sub panel</Link> +{' '}
                                            <span className="text-orange-200">super panel</span>. Upgrading stacks your income faster.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <RmsCard variant="neon" className="!rounded-[22px] !border-violet-300/25 !bg-[#0b1020]/80 !p-3.5 shadow-[0_0_30px_rgba(139,92,246,0.14)] sm:!p-4">
                        <h2 className="text-base font-bold text-white">Buy package slots</h2>
                        <ul className="mt-3.5 grid list-none grid-cols-2 gap-2 sm:grid-cols-3">
                            {Array.from({ length: maxSuper }, (_, i) => i + 1).map((n) => {
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
                                        <p className="mt-2 text-lg font-bold tabular-nums text-fuchsia-300">{fmtUsd((n * safePanelFee).toFixed(2))}</p>
                                        <p className="mt-0.5 text-[11px] tabular-nums text-white/45">
                                            package entry · +{fmtUsd((n * eachSuper).toFixed(2))}{' '}
                                            <span className="text-white/35">/survey</span>
                                        </p>
                                        {isNext && !owned ? (
                                            <button
                                                type="button"
                                                disabled={!canBuyNext || !qualified}
                                                onClick={() => postSuperSubPanel()}
                                                className="mt-3 w-full rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 py-2 text-xs font-semibold text-white shadow-md shadow-violet-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {qualified ? `Upgrade ${fmtUsd(data.fees.super_sub_panel_usd)}` : 'Locked'}
                                            </button>
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ul>
                        {count >= maxSuper ? (
                            <p className="mt-4 text-center text-sm font-medium text-emerald-400">Full package — all {maxSuper} super panels active.</p>
                        ) : null}
                    </RmsCard>
                </>
            ) : (
                !loadError && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/60">Loading…</div>
                )
            )}
        </div>
    );
}

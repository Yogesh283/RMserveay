import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { prepareSanctum } from '../../lib/auth';
import { RmsCard } from '../components/rms';

function fmtUsd(s) {
    const n = Number.parseFloat(String(s));
    if (Number.isNaN(n)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function IconPerson() {
    return (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/25 text-sky-200 ring-2 ring-sky-400/30">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Z" />
                <path d="M4 20.5c1.5-3.5 5-5.5 8-5.5s6.5 2 8 5.5" strokeLinecap="round" />
            </svg>
        </span>
    );
}

function IconPeople() {
    return (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/25 text-orange-200 ring-2 ring-orange-400/35">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M8 11a2.5 2.5 0 1 0-2.5-2.5A2.5 2.5 0 0 0 8 11Z" />
                <path d="M16 11a2.5 2.5 0 1 0-2.5-2.5A2.5 2.5 0 0 0 16 11Z" />
                <path d="M2 20.5c.8-2.2 2.6-3.5 4.5-3.5M22 20.5c-.8-2.2-2.6-3.5-4.5-3.5" strokeLinecap="round" />
            </svg>
        </span>
    );
}

function IconClipboard() {
    return (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e3a5f] text-sky-100 ring-2 ring-sky-500/25">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M9 4h6l1 2h3v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h3Z" />
                <path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
                <path d="M9 12h6M9 16h4" strokeLinecap="round" />
            </svg>
        </span>
    );
}

export default function MemberActivePanelsPage() {
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

    async function postAction(path) {
        setActionError(null);
        setBusy(true);
        try {
            await prepareSanctum();
            const { data: json } = await window.axios.post(`api/member/programme/self-survey/${path}`);
            setData(json);
        } catch (e) {
            const msg = e.response?.data?.message ?? e.message ?? 'Request failed';
            setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setBusy(false);
        }
    }

    const qualified = data?.active_panelist_qualified ?? false;
    const activationPaid = data?.activation_fee_paid === true;
    const activeSurveyMin = data?.fees?.active_panelist_per_survey_usd;

    return (
        <div className="relative mx-auto max-w-4xl space-y-5">
            <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/45">Active panelist</p>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    <span className="text-white">Active panelist </span>
                    <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Income</span>
                </h1>
                <p className="max-w-xl text-sm text-white/65">
                    Pay <span className="font-semibold text-white">{data ? fmtUsd(data.fees.activation_usd) : '$1'}</span> once, then{' '}
                    <span className="font-semibold text-white">{data ? fmtUsd(data.fees.minimum_panel_usd) : '$10'}</span> in one payment.
                </p>
            </div>

            {loadError ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{loadError}</p>
            ) : null}
            {actionError ? <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{actionError}</p> : null}

            {data ? (
                <>
                <RmsCard variant="neon" className="overflow-hidden !p-0">
                    {/* Wallet strip */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3 sm:px-6">
                        <p className="text-sm text-white/70">
                            Total per survey{' '}
                            <span className="font-bold tabular-nums text-white">{fmtUsd(data.per_survey_total)}</span>
                        </p>
                        <p className="text-sm text-white/70">
                            Wallet <span className="font-semibold tabular-nums text-white">{fmtUsd(data.wallet_balance)}</span>
                            <span className="mx-2 text-white/30">·</span>
                            <Link to="/member/wallet/deposit" className="text-[#F59E0B] underline-offset-2 hover:text-amber-300 hover:underline">
                                Add funds
                            </Link>
                        </p>
                    </div>

                    {/* Slide-style row: activation | minimum | survey income */}
                    <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
                        <div className="flex flex-col rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 py-4">
                            <div className="flex items-start gap-3">
                                <IconPerson />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-white/70">Activation fee</p>
                                    <p className="mt-1 text-lg font-bold">
                                        <span className="text-orange-400 tabular-nums">{fmtUsd(data.fees.activation_usd)}</span>
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-white/45">One-time</p>
                                </div>
                            </div>
                            {data.activation_fee_paid ? (
                                <p className="mt-3 text-xs font-semibold text-emerald-400">Paid</p>
                            ) : (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => postAction('pay-activation')}
                                    className="mt-4 w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
                                >
                                    Pay {fmtUsd(data.fees.activation_usd)}
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 py-4">
                            <div className="flex items-start gap-3">
                                <IconPeople />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-white/70">Minimum panel fee</p>
                                    <p className="mt-1 text-lg font-bold">
                                        <span className="text-orange-400 tabular-nums">{fmtUsd(data.fees.minimum_panel_usd)}</span>
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-white/45">Single payment</p>
                                </div>
                            </div>
                            {data.minimum_panel_fee_paid ? (
                                <p className="mt-3 text-xs font-semibold text-emerald-400">Paid</p>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        disabled={busy || !activationPaid}
                                        onClick={() => postAction('pay-minimum-panel')}
                                        className="mt-4 w-full rounded-xl bg-orange-600 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Pay {fmtUsd(data.fees.minimum_panel_usd)}
                                    </button>
                                    {!activationPaid ? (
                                        <p className="mt-2 text-center text-[10px] text-white/45">Pay activation first</p>
                                    ) : null}
                                </>
                            )}
                        </div>

                        <div className="flex flex-col rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 py-4">
                            <div className="flex items-start gap-3">
                                <IconClipboard />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-white/70">Survey income</p>
                                    <p className="mt-1 text-lg font-bold leading-snug">
                                        <span className="text-orange-400">
                                            Min {activeSurveyMin != null ? fmtUsd(activeSurveyMin) : '$1.00'} per survey
                                        </span>
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-white/45">Active panelist portion</p>
                                </div>
                            </div>
                            <p className="mt-auto pt-3 text-xs text-white/55">
                                Current total rate: <span className="font-semibold tabular-nums text-white">{fmtUsd(data.per_survey_total)}</span>
                            </p>
                        </div>
                    </div>

                    {!qualified ? (
                        <p className="border-t border-amber-500/15 bg-amber-950/20 px-5 py-2.5 text-center text-[11px] text-amber-100/90 sm:px-6">
                            Pay both fees above for full active panelist survey income.
                        </p>
                    ) : (
                        <p className="border-t border-emerald-500/15 bg-emerald-950/20 px-5 py-2.5 text-center text-[11px] text-emerald-100/90 sm:px-6">
                            Active panelist — your survey rate includes the active tier.
                        </p>
                    )}
                </RmsCard>

                <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                        to="/member/sub-panels"
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-fuchsia-500/45 bg-gradient-to-br from-fuchsia-950/55 via-violet-950/40 to-[#111827] px-4 py-3.5 text-sm font-semibold text-fuchsia-100 shadow-[0_0_28px_rgba(192,38,211,0.18)] ring-1 ring-fuchsia-500/20 transition hover:border-fuchsia-400/60 hover:shadow-[0_0_36px_rgba(217,70,239,0.22)] active:scale-[0.99]"
                    >
                        Sub panel
                    </Link>
                    <Link
                        to="/member/super-sub-panels"
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-950/50 via-orange-950/35 to-[#111827] px-4 py-3.5 text-sm font-semibold text-amber-100 shadow-[0_0_28px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/25 transition hover:border-amber-400/65 hover:shadow-[0_0_36px_rgba(251,191,36,0.22)] active:scale-[0.99]"
                    >
                        Super panel
                    </Link>
                </div>
                </>
            ) : (
                !loadError && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/60">Loading…</div>
                )
            )}
        </div>
    );
}

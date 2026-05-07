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

    const progressPct = qualified ? 100 : activationPaid ? 50 : 0;
    const timeline = ['Start', 'Verify', 'Submit', 'Complete'];

    return (
        <div className="relative mx-auto max-w-2xl space-y-4">
            <div className="pointer-events-none absolute -top-10 right-0 h-40 w-40 rounded-full bg-violet-600/20 blur-[90px]" />
            <div className="pointer-events-none absolute top-40 left-2 h-36 w-36 rounded-full bg-fuchsia-500/12 blur-[78px]" />

            {loadError ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{loadError}</p> : null}
            {actionError ? <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{actionError}</p> : null}

            {data ? (
                <>
                    <RmsCard variant="neon" className="overflow-hidden !rounded-[24px] !border-violet-300/30 !bg-[#0b1020]/86 !p-0 shadow-[0_0_42px_rgba(139,92,246,0.16)] backdrop-blur-xl">
                        <div className="border-b border-violet-300/15 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-200/90">✨ IMPROVED VERSION</p>
                        </div>

                        <div className="grid gap-3 p-3.5">
                            <div className="flex items-start justify-between gap-3 rounded-2xl border border-violet-300/20 bg-white/[0.03] p-3">
                                <div className="flex items-center gap-3">
                                    <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-violet-300/55 bg-violet-500/20 text-base font-bold text-white shadow-[0_0_22px_rgba(139,92,246,0.45)]">
                                        V
                                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#0B1120] bg-emerald-400" />
                                    </span>
                                    <div>
                                        <p className="text-xs text-[#A0AEC0]">Welcome back, vijay damor</p>
                                        <div className="mt-1 flex items-center gap-1.5">
                                            <span className="rounded-full border border-violet-300/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-100">ID: vjd</span>
                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                                                <span>✓</span> Verified
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/25 bg-violet-500/10 text-violet-200 shadow-[0_0_18px_rgba(139,92,246,0.25)]">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
                                    </svg>
                                </span>
                            </div>

                            <div className="rounded-2xl border border-violet-300/25 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-3.5">
                                <div className="flex items-center gap-3">
                                    <div className="relative h-12 w-12 shrink-0 rounded-full border border-violet-300/40 bg-[#0b1020]">
                                        <div className="absolute inset-[5px] rounded-full border border-violet-300/50" />
                                        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-violet-200">{progressPct}%</div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">Complete your ID Activation</p>
                                        <p className="text-[11px] text-[#94A3B8]">Unlock full rewards, referrals and matching income flow.</p>
                                    </div>
                                </div>

                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        disabled={busy || data.activation_fee_paid}
                                        onClick={() => postAction('pay-activation')}
                                        className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(168,85,247,0.35)] disabled:opacity-45"
                                    >
                                        {data.activation_fee_paid ? 'Activation Paid' : `Activate ID → ${fmtUsd(data.fees.activation_usd)}`}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy || !activationPaid || data.minimum_panel_fee_paid}
                                        onClick={() => postAction('pay-minimum-panel')}
                                        className="rounded-xl border border-amber-400/55 bg-amber-500/10 py-2.5 text-sm font-semibold text-amber-200 transition hover:border-amber-300/80 hover:bg-amber-500/15 disabled:opacity-40"
                                    >
                                        {data.minimum_panel_fee_paid ? 'Minimum Paid' : `Pay Min ${fmtUsd(data.fees.minimum_panel_usd)}`}
                                    </button>
                                </div>

                                <div className="mt-3 grid grid-cols-4 gap-1.5">
                                    {timeline.map((step, i) => {
                                        const active = i <= Math.floor(progressPct / 34);
                                        return (
                                            <div key={step} className="text-center">
                                                <span className={`mx-auto block h-2 w-2 rounded-full ${active ? 'bg-violet-400 shadow-[0_0_10px_rgba(168,85,247,0.7)]' : 'bg-white/20'}`} />
                                                <p className="mt-1 text-[9px] text-[#94A3B8]">{step}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-violet-300/15 p-3">
                            {[
                                ['More Rewards', 'Unlock exclusive offers and bonuses'],
                                ['Referral Boost', 'Earn more with your network'],
                                ['Secure & Verified', 'Your account stays safe and trusted'],
                                ['Instant Access', 'Get full access to all features'],
                            ].map(([title, sub]) => (
                                <div key={title} className="rounded-xl border border-violet-300/20 bg-white/[0.03] p-2.5">
                                    <p className="text-[11px] font-semibold text-white">{title}</p>
                                    <p className="mt-0.5 text-[9px] text-[#94A3B8]">{sub}</p>
                                </div>
                            ))}
                        </div>
                    </RmsCard>

                    <div className="grid gap-2.5 sm:grid-cols-2">
                        <Link
                            to="/member/sub-panels"
                            className="inline-flex w-full items-center justify-center rounded-2xl border border-violet-400/45 bg-gradient-to-br from-violet-950/60 via-fuchsia-950/40 to-[#111827] px-4 py-3 text-sm font-semibold text-violet-100 shadow-[0_0_28px_rgba(139,92,246,0.2)] ring-1 ring-violet-500/20 transition hover:border-violet-300/70 hover:shadow-[0_0_36px_rgba(168,85,247,0.22)] active:scale-[0.99]"
                        >
                            Sub panel
                        </Link>
                        <Link
                            to="/member/super-sub-panels"
                            className="inline-flex w-full items-center justify-center rounded-2xl border border-violet-400/45 bg-gradient-to-br from-[#29124a]/70 via-[#2b1246]/50 to-[#111827] px-4 py-3 text-sm font-semibold text-violet-100 shadow-[0_0_28px_rgba(139,92,246,0.2)] ring-1 ring-violet-500/25 transition hover:border-violet-300/70 hover:shadow-[0_0_36px_rgba(168,85,247,0.24)] active:scale-[0.99]"
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

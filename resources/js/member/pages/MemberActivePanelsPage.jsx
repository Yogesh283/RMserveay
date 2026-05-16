import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { prepareSanctum } from '../../lib/auth';
import { RmsCard } from '../components/rms';

function fmtUsd(s) {
    const n = Number.parseFloat(String(s));
    if (Number.isNaN(n)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function MemberActivePanelsPage() {
    const [data, setData] = useState(null);
    const [user, setUser] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState(null);

    const load = useCallback(async () => {
        setLoadError(null);
        try {
            await prepareSanctum();
            const [{ data: json }, { data: userJson }] = await Promise.all([
                window.axios.get('api/member/programme/self-survey'),
                window.axios.get('api/user'),
            ]);
            setData(json);
            setUser(userJson?.user ?? null);
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

    const progressPct = qualified ? 100 : activationPaid ? 50 : 0;
    const timeline = ['Start', 'Verify', 'Submit', 'Complete'];
    const displayName = user?.name?.trim() || 'Member';
    const displayId = (user?.login_uid || '—').toString().toUpperCase();
    const displayInitial = displayName.charAt(0).toUpperCase();
    const isVerified = Boolean(user?.email_verified_at || user?.phone_verified_at);

    return (
        <div className="relative mx-auto max-w-2xl space-y-2.5">
            <div className="pointer-events-none absolute -top-10 right-0 h-32 w-32 rounded-full bg-violet-600/18 blur-[80px]" />
            <div className="pointer-events-none absolute top-28 left-2 h-28 w-28 rounded-full bg-fuchsia-500/10 blur-[70px]" />

            {loadError ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{loadError}</p> : null}
            {actionError ? <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{actionError}</p> : null}

            {data ? (
                <>
                    <RmsCard variant="neon" className="overflow-hidden !rounded-[18px] !border-violet-300/25 !bg-[#0b1020]/86 !p-0 shadow-[0_0_28px_rgba(139,92,246,0.12)] backdrop-blur-xl">
                        <div className="border-b border-violet-300/12 px-3 py-1.5">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-fuchsia-200/85">✨ IMPROVED VERSION</p>
                        </div>

                        <div className="grid gap-2 p-2.5">
                            <div className="flex items-start justify-between gap-2 rounded-xl border border-violet-300/18 bg-white/[0.025] p-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-300/50 bg-violet-500/18 text-sm font-bold text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]">
                                        {displayInitial}
                                        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#0B1120] bg-emerald-400" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-[11px] text-[#A0AEC0]">Welcome back, {displayName}</p>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                            <span className="rounded-full border border-violet-300/28 bg-violet-500/12 px-1.5 py-px text-[9px] font-semibold text-violet-100">
                                                ID: {displayId}
                                            </span>
                                            {isVerified ? (
                                                <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-1.5 py-px text-[9px] font-semibold text-emerald-200">
                                                    <span>✓</span> Verified
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-300/22 bg-violet-500/10 text-violet-200">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
                                    </svg>
                                </span>
                            </div>

                            <div className="rounded-xl border border-violet-300/20 bg-gradient-to-br from-white/[0.04] to-white/[0.015] p-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="relative h-10 w-10 shrink-0 rounded-full border border-violet-300/35 bg-[#0b1020]">
                                        <div className="absolute inset-[4px] rounded-full border border-violet-300/45" />
                                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-violet-200">{progressPct}%</div>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-semibold leading-tight text-white">Complete your ID Activation</p>
                                        <p className="text-[10px] leading-snug text-[#94A3B8]">Unlock rewards, referrals and matching income.</p>
                                    </div>
                                </div>

                                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        disabled={busy || data.activation_fee_paid}
                                        onClick={() => postAction('pay-activation')}
                                        className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 py-2 text-xs font-semibold text-white shadow-[0_8px_16px_rgba(168,85,247,0.28)] sm:text-sm disabled:opacity-45"
                                    >
                                        {data.activation_fee_paid ? 'Activation Paid' : `Activate ID → ${fmtUsd(data.fees.activation_usd)}`}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy || !activationPaid || data.minimum_panel_fee_paid}
                                        onClick={() => postAction('pay-minimum-panel')}
                                        className="rounded-lg border border-amber-400/50 bg-amber-500/10 py-2 text-xs font-semibold text-amber-200 transition hover:border-amber-300/75 hover:bg-amber-500/14 sm:text-sm disabled:opacity-40"
                                    >
                                        {data.minimum_panel_fee_paid ? 'Minimum Paid' : `Pay Min ${fmtUsd(data.fees.minimum_panel_usd)}`}
                                    </button>
                                </div>

                                <div className="mt-2 grid grid-cols-4 gap-1">
                                    {timeline.map((step, i) => {
                                        const active = i <= Math.floor(progressPct / 34);
                                        return (
                                            <div key={step} className="text-center">
                                                <span
                                                    className={`mx-auto block h-1.5 w-1.5 rounded-full ${
                                                        active ? 'bg-violet-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-white/20'
                                                    }`}
                                                />
                                                <p className="mt-0.5 text-[8px] leading-tight text-[#94A3B8]">{step}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 border-t border-violet-300/12 p-2">
                            {[
                                ['More Rewards', 'Exclusive offers and bonuses'],
                                ['Referral Boost', 'Earn more with your network'],
                                ['Secure & Verified', 'Account stays trusted'],
                                ['Instant Access', 'Full feature access'],
                            ].map(([title, sub]) => (
                                <div key={title} className="rounded-lg border border-violet-300/18 bg-white/[0.025] p-2">
                                    <p className="text-[10px] font-semibold leading-tight text-white">{title}</p>
                                    <p className="mt-px text-[8px] leading-tight text-[#94A3B8]">{sub}</p>
                                </div>
                            ))}
                        </div>
                    </RmsCard>

                    <div className="grid gap-1.5 sm:grid-cols-2">
                        <Link
                            to="/member/sub-panels"
                            className="inline-flex w-full items-center justify-center rounded-xl border border-violet-400/40 bg-gradient-to-br from-violet-950/60 via-fuchsia-950/40 to-[#111827] px-3 py-2 text-xs font-semibold text-violet-100 shadow-[0_0_20px_rgba(139,92,246,0.16)] ring-1 ring-violet-500/18 transition hover:border-violet-300/65 sm:text-sm active:scale-[0.99]"
                        >
                            Sub panel
                        </Link>
                        <Link
                            to="/member/super-sub-panels"
                            className="inline-flex w-full items-center justify-center rounded-xl border border-violet-400/40 bg-gradient-to-br from-[#29124a]/70 via-[#2b1246]/50 to-[#111827] px-3 py-2 text-xs font-semibold text-violet-100 shadow-[0_0_20px_rgba(139,92,246,0.16)] ring-1 ring-violet-500/22 transition hover:border-violet-300/65 sm:text-sm active:scale-[0.99]"
                        >
                            Super panel
                        </Link>
                    </div>
                </>
            ) : (
                !loadError && (
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-7 text-center text-xs text-white/60">Loading…</div>
                )
            )}
        </div>
    );
}

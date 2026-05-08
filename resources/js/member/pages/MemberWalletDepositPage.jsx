import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { prepareSanctum } from '../../lib/auth';

const PAY_LABELS = {
    usdtbsc: 'USDT · BEP-20',
    usdttrc20: 'USDT · TRC20',
    usdterc20: 'USDT · ERC20',
};

function IconWallet3d() {
    return (
        <svg viewBox="0 0 120 120" className="h-[4.75rem] w-[4.75rem] shrink-0 drop-shadow-[0_0_20px_rgba(139,92,246,0.4)]" aria-hidden>
            <defs>
                <linearGradient id="wtop" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <linearGradient id="wface" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#312e81" />
                    <stop offset="100%" stopColor="#1e1b4b" />
                </linearGradient>
            </defs>
            <ellipse cx="60" cy="88" rx="44" ry="10" fill="rgba(99,102,241,0.25)" />
            <path d="M24 48 L60 28 L96 48 L96 78 L60 98 L24 78 Z" fill="url(#wface)" stroke="rgba(167,139,250,0.5)" strokeWidth="1.2" />
            <path d="M24 48 L60 28 L96 48 L60 68 Z" fill="url(#wtop)" opacity="0.95" />
            <rect x="42" y="52" width="36" height="22" rx="4" fill="rgba(15,23,42,0.85)" stroke="rgba(139,92,246,0.4)" />
            <circle cx="60" cy="63" r="6" fill="#22d3ee" opacity="0.9" />
        </svg>
    );
}

function IconEye({ open }) {
    if (open) {
        return (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 5 12 5c4.638 0 8.573 2.511 9.963 6.683a1.012 1.012 0 010 .639C20.577 16.49 16.64 19 12 19c-4.638 0-8.573-2.511-9.964-6.678z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        );
    }
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19 12 19c1.331 0 2.605-.236 3.775-.654M6.228 6.228A10.45 10.45 0 0112 5c4.756 0 8.773 2.662 10.065 6.998a10.525 10.525 0 01-4.293 5.614M6.228 6.228L3 3m0 0l3 3m-3-3l6.486 6.486m11.542 11.542L21 21m-3-3l3 3m-3-3l-6.486-6.486" />
        </svg>
    );
}

function IconShield() {
    return (
            <svg className="mx-auto h-6 w-6 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285zm0 13.5h.008v.008h-.008v-.008z" />
        </svg>
    );
}

function IconBolt() {
    return (
            <svg className="mx-auto h-6 w-6 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
    );
}

function IconGlobe() {
    return (
            <svg className="mx-auto h-6 w-6 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
    );
}

function qaClass(active) {
    return [
        'flex min-w-[4.25rem] flex-col items-center gap-0.5 rounded-xl px-1.5 py-1.5 text-[9px] font-semibold leading-tight transition-all duration-200 sm:min-w-[4.75rem] sm:text-[10px]',
        active
            ? 'bg-gradient-to-br from-violet-600/50 to-indigo-600/40 text-white shadow-[0_0_24px_rgba(139,92,246,0.45)] ring-1 ring-violet-400/50'
            : 'text-slate-400 hover:bg-white/[0.06] hover:text-white',
    ].join(' ');
}

export default function MemberWalletDepositPage() {
    const { t } = useTranslation();
    const [info, setInfo] = useState(null);
    const [balance, setBalance] = useState(null);
    const [p2pBalance, setP2pBalance] = useState(null);
    const [msg, setMsg] = useState(null);
    const [err, setErr] = useState(null);
    const [hideBalance, setHideBalance] = useState(false);

    const [npAmount, setNpAmount] = useState('');
    const [npBusy, setNpBusy] = useState(false);
    const [npErr, setNpErr] = useState(null);
    const [npPayment, setNpPayment] = useState(null);
    const [payCurrency, setPayCurrency] = useState('usdtbsc');
    const [countdownSec, setCountdownSec] = useState(0);
    const [successOpen, setSuccessOpen] = useState(false);
    const [successAmount, setSuccessAmount] = useState(null);
    const [errorOpen, setErrorOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const creditedOnceRef = useRef(false);
    const successAutoCloseRef = useRef(null);
    const errorAutoCloseRef = useRef(null);
    const AUTO_CLOSE_MS = 180000; // 3 minutes

    useEffect(() => {
        return () => {
            if (successAutoCloseRef.current) window.clearTimeout(successAutoCloseRef.current);
            if (errorAutoCloseRef.current) window.clearTimeout(errorAutoCloseRef.current);
        };
    }, []);

    const load = useCallback(async () => {
        try {
            const [di, ov] = await Promise.all([
                window.axios.get('api/member/wallet/deposit-info'),
                window.axios.get('api/member/wallet/overview'),
            ]);
            setInfo(di.data);
            setBalance(ov.data.wallet_balance);
            setP2pBalance(ov.data.p2p_wallet_balance);
            const list = di.data?.nowpayments_pay_currencies;
            const def = di.data?.nowpayments_default_pay_currency || 'usdtbsc';
            if (Array.isArray(list) && list.length > 0) {
                setPayCurrency((c) => (list.includes(c) ? c : def));
            } else {
                setPayCurrency(def);
            }
        } catch (e) {
            setErr(e.response?.data?.message ?? e.message);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const totalUsd = useMemo(() => {
        if (balance === null || p2pBalance === null) return null;
        const a = Number.parseFloat(balance) || 0;
        const b = Number.parseFloat(p2pBalance) || 0;
        return (a + b).toFixed(2);
    }, [balance, p2pBalance]);

    const minUsd = info ? Number.parseFloat(info.min_deposit_usd) || 1 : 1;
    const presets = [10, 25, 50, 100];
    const timerText = useMemo(() => {
        if (countdownSec <= 0) return '00:00';
        const mm = String(Math.floor(countdownSec / 60)).padStart(2, '0');
        const ss = String(countdownSec % 60).padStart(2, '0');
        return `${mm}:${ss}`;
    }, [countdownSec]);

    const onDepositCredited = useCallback(async (local = {}) => {
        if (creditedOnceRef.current) return;
        creditedOnceRef.current = true;
        const amount = local.amount_usd ?? npPayment?.amount_usd ?? null;
        setSuccessAmount(amount);
        setSuccessOpen(true);
        if (successAutoCloseRef.current) window.clearTimeout(successAutoCloseRef.current);
        successAutoCloseRef.current = window.setTimeout(() => setSuccessOpen(false), AUTO_CLOSE_MS);
        setMsg('Deposit credited to your main wallet.');
        setNpPayment(null);
        setCountdownSec(0);
        await load();
    }, [load, npPayment?.amount_usd]);

    function openErrorPopup(message) {
        const m = message == null ? null : String(message);
        if (!m) return;
        setErrorMessage(m);
        setErrorOpen(true);
        if (errorAutoCloseRef.current) window.clearTimeout(errorAutoCloseRef.current);
        errorAutoCloseRef.current = window.setTimeout(() => setErrorOpen(false), AUTO_CLOSE_MS);
    }

    async function copyNpAddress() {
        if (!npPayment?.pay_address) return;
        try {
            await navigator.clipboard.writeText(npPayment.pay_address);
            setMsg('Deposit address copied.');
            setTimeout(() => setMsg(null), 2500);
        } catch {
            setErr('Could not copy — select and copy manually.');
        }
    }

    async function createNowPayment(e) {
        e?.preventDefault?.();
        setNpErr(null);
        setMsg(null);
        setNpBusy(true);
        try {
            await prepareSanctum();
            const { data } = await window.axios.post('api/member/wallet/nowpayments/payment', {
                amount_usd: Number.parseFloat(npAmount),
                pay_currency: payCurrency,
            });
            setNpPayment(data);
            setCountdownSec(120);
            creditedOnceRef.current = false;
            setNpAmount('');
        } catch (e) {
            const m = e.response?.data?.message ?? e.response?.data?.errors ?? e.response?.data?.details;
            const flat = typeof m === 'object' ? JSON.stringify(m) : (m ?? 'Request failed');
            setNpErr(flat);
            openErrorPopup(flat);
        } finally {
            setNpBusy(false);
        }
    }

    async function refreshNpStatus(pid = npPayment?.payment_id) {
        if (!pid) return;
        setNpErr(null);
        try {
            await prepareSanctum();
            const { data } = await window.axios.get(`api/member/wallet/nowpayments/${pid}`);
            const local = data.local ?? {};
            if (local.credited) {
                await onDepositCredited(local);
                return;
            }
            setNpPayment((prev) => ({
                ...prev,
                payment_status: local.payment_status ?? prev?.payment_status,
                pay_address: local.pay_address ?? prev?.pay_address,
                pay_amount: local.pay_amount ?? prev?.pay_amount,
                pay_currency: local.pay_currency ?? prev?.pay_currency,
            }));
        } catch (e) {
            const flat = e.response?.data?.message ?? e.message ?? 'Status check failed';
            setNpErr(flat);
            openErrorPopup(flat);
        }
    }

    useEffect(() => {
        const pid = npPayment?.payment_id;
        if (!pid) return undefined;
        setCountdownSec(120);
        const timerId = window.setInterval(() => {
            setCountdownSec((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => window.clearInterval(timerId);
    }, [npPayment?.payment_id]);

    useEffect(() => {
        const pid = npPayment?.payment_id;
        if (!pid) return undefined;

        let cancelled = false;

        async function tick() {
            try {
                await prepareSanctum();
                const { data } = await window.axios.get(`api/member/wallet/nowpayments/${pid}`);
                if (cancelled) return;
                const local = data.local ?? {};
                if (local.credited) {
                    await onDepositCredited(local);
                    return;
                }
                setNpPayment((prev) => ({
                    ...prev,
                    payment_status: local.payment_status ?? prev?.payment_status,
                    pay_address: local.pay_address ?? prev?.pay_address,
                    pay_amount: local.pay_amount ?? prev?.pay_amount,
                    pay_currency: local.pay_currency ?? prev?.pay_currency,
                }));
            } catch (e) {
                if (!cancelled) {
                    setNpErr(e.response?.data?.message ?? e.message ?? 'Status check failed');
                }
            }
        }

        const t = window.setInterval(() => void tick(), 12000);
        void tick();

        return () => {
            cancelled = true;
            window.clearInterval(t);
        };
    }, [npPayment?.payment_id, load, onDepositCredited]);

    const glass = 'rounded-2xl border border-white/[0.12] bg-gradient-to-br from-white/[0.08] to-white/[0.02] shadow-[0_6px_28px_rgba(0,0,0,0.4)] backdrop-blur-xl';
    const glassSoft = 'rounded-2xl border border-white/[0.1] bg-white/[0.04] backdrop-blur-md';

    return (
        <div className="relative mx-auto max-w-md px-1 pb-5 font-[Inter,system-ui,sans-serif] sm:px-0">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(ellipse_at_50%_0%,rgba(124,58,237,0.32),transparent_70%)]" aria-hidden />

            {msg ? <p className="mb-2 text-center text-xs font-medium text-emerald-400">{msg}</p> : null}
            {err ? <p className="mb-2 text-center text-xs text-red-400">{err}</p> : null}

            {/* Main wallet card */}
            <section className={`relative overflow-hidden p-4 sm:p-5 ${glass}`}>
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-500/20 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-8 -left-6 h-24 w-24 rounded-full bg-cyan-500/15 blur-2xl" />

                <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total balance</p>
                        <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                            <span className="text-2xl font-bold tabular-nums tracking-tight text-white sm:text-3xl">
                                {totalUsd === null ? '—' : hideBalance ? '••••••' : `$${totalUsd}`}
                            </span>
                            <span className="text-xs font-medium text-slate-500">USD</span>
                        </div>
                        {totalUsd !== null && !hideBalance ? (
                            <p className="mt-0.5 text-[11px] text-slate-500">
                                Main <span className="font-mono text-slate-400">${Number.parseFloat(balance || 0).toFixed(2)}</span>
                                <span className="mx-1 text-slate-600">·</span>
                                P2P <span className="font-mono text-slate-400">${Number.parseFloat(p2pBalance || 0).toFixed(2)}</span>
                                <span className="mx-1 text-slate-600">·</span>
                                <span className="text-violet-300/90">≈ USDT</span>
                            </p>
                        ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                        <button
                            type="button"
                            onClick={() => setHideBalance((v) => !v)}
                            className="rounded-lg border border-white/15 bg-slate-950/50 p-1.5 text-slate-300 transition hover:border-violet-400/40 hover:text-white"
                            aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
                        >
                            <IconEye open={!hideBalance} />
                        </button>
                        <IconWallet3d />
                    </div>
                </div>
            </section>

            {/* Quick actions */}
            <nav className="mt-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Wallet quick actions">
                <div className="flex w-max gap-1.5 px-0.5">
                    <NavLink to="/member/wallet" end className={({ isActive }) => qaClass(isActive)}>
                        <span className="text-base" aria-hidden>
                            ⌂
                        </span>
                        Wallet home
                    </NavLink>
                    <NavLink to="/member/wallet/internal" className={({ isActive }) => qaClass(isActive)}>
                        <span className="text-base" aria-hidden>
                            ⇄
                        </span>
                        Main ↔ P2P
                    </NavLink>
                    <NavLink to="/member/wallet/deposit" className={({ isActive }) => qaClass(isActive)}>
                        <span className="text-base" aria-hidden>
                            ↓
                        </span>
                        {t('member.walletHub.deposit')}
                    </NavLink>
                    <NavLink to="/member/wallet/p2p" className={({ isActive }) => qaClass(isActive)}>
                        <span className="text-base" aria-hidden>
                            ⧉
                        </span>
                        {t('member.walletHub.p2pSendQr')}
                    </NavLink>
                    <NavLink to="/member/wallet/withdraw" className={({ isActive }) => qaClass(isActive)}>
                        <span className="text-base" aria-hidden>
                            ↑
                        </span>
                        {t('member.walletHub.withdraw')}
                    </NavLink>
                </div>
            </nav>

            {/* NOWPayments */}
            {info?.nowpayments_enabled ? (
                <section className={`mt-4 p-4 sm:p-5 ${glass}`}>

                    {!npPayment ? (
                        <form onSubmit={createNowPayment} className="mt-3 space-y-3">
                            <div>
                                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Amount (USD)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={npAmount}
                                    onChange={(ev) => setNpAmount(ev.target.value)}
                                    placeholder="0.00"
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-base font-semibold tabular-nums text-white shadow-inner shadow-black/30 outline-none ring-0 transition placeholder:text-slate-600 focus:border-violet-500/50 focus:shadow-[0_0_0_2px_rgba(139,92,246,0.2)]"
                                />
                            </div>

                            {info?.nowpayments_pay_currencies?.length > 0 ? (
                                <div>
                                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pay with</label>
                                    <select
                                        value={payCurrency}
                                        onChange={(ev) => setPayCurrency(ev.target.value)}
                                        className="w-full appearance-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-xs font-medium text-white outline-none focus:border-violet-500/50"
                                    >
                                        {info.nowpayments_pay_currencies.map((c) => (
                                            <option key={c} value={c}>
                                                {PAY_LABELS[c] ?? c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : null}

                            <div>
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Quick amount</p>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {presets.map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setNpAmount(String(n))}
                                            disabled={n < minUsd}
                                            className="rounded-lg border border-white/10 bg-white/[0.04] py-2 text-xs font-bold tabular-nums text-white transition hover:border-violet-400/40 hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-35"
                                        >
                                            ${n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={npBusy}
                                className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(109,40,217,0.35)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
                            >
                                <span className="relative z-10">{npBusy ? 'Creating…' : 'Create payment →'}</span>
                                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            </button>
                            {npErr ? <p className="text-center text-sm text-red-400">{npErr}</p> : null}
                        </form>
                    ) : (
                        <div className="mt-3 space-y-3">
                            <p className="text-xs text-slate-400">
                                Send exactly <strong className="tabular-nums text-cyan-300">{npPayment.pay_amount}</strong> {npPayment.pay_currency}{' '}
                                <span className="text-slate-600">·</span> <span className="font-mono text-xs text-slate-500">{npPayment.order_id}</span>
                            </p>
                            <p className="inline-flex items-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">
                                Auto status check: {timerText}
                            </p>
                            {npPayment.pay_address ? (
                                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                                    <div className={`rounded-xl border border-white/10 bg-slate-950/50 p-2.5 ${glassSoft}`}>
                                        <QRCodeSVG value={npPayment.pay_address} size={136} level="M" includeMargin />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
                                            <button
                                                type="button"
                                                onClick={copyNpAddress}
                                                className="rounded-lg border border-violet-400/40 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/15"
                                            >
                                                Copy address
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => refreshNpStatus()}
                                                className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-lg"
                                            >
                                                Refresh status
                                            </button>
                                            <button type="button" onClick={() => setNpPayment(null)} className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:text-white">
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                            {npErr ? <p className="text-center text-sm text-red-400">{npErr}</p> : null}
                        </div>
                    )}
                </section>
            ) : (
                info && (
                    <section className={`mt-4 p-4 text-center ${glass}`}>
                        <p className="text-xs text-slate-400">Crypto checkout is not enabled. Minimum when enabled: ${info.min_deposit_usd}.</p>
                    </section>
                )
            )}

            {/* Feature strip */}
            <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
                <div className={`p-2 text-center sm:p-2.5 ${glassSoft}`}>
                    <IconShield />
                    <p className="mt-1 text-[10px] font-bold text-white">Secure</p>
                    <p className="text-[9px] leading-snug text-slate-500">Encrypted checkout</p>
                </div>
                <div className={`p-2 text-center sm:p-2.5 ${glassSoft}`}>
                    <IconBolt />
                    <p className="mt-1 text-[10px] font-bold text-white">Instant</p>
                    <p className="text-[9px] leading-snug text-slate-500">Fast confirmation</p>
                </div>
                <div className={`p-2 text-center sm:p-2.5 ${glassSoft}`}>
                    <IconGlobe />
                    <p className="mt-1 text-[10px] font-bold text-white">Global</p>
                    <p className="text-[9px] leading-snug text-slate-500">Multi-network</p>
                </div>
            </div>

            <p className="mt-5 text-center text-[9px] text-slate-600">Wallet · NOWPayments</p>

            {successOpen ? (
                <div className="fixed inset-0 z-[220] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="deposit-success-title">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/60"
                        aria-label="Close"
                        onClick={() => {
                            setSuccessOpen(false);
                            if (successAutoCloseRef.current) window.clearTimeout(successAutoCloseRef.current);
                        }}
                    />
                    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-emerald-400/25 bg-[#0b1220] p-5 text-center shadow-xl">
                        <p className="text-3xl" aria-hidden>✅</p>
                        <h3 id="deposit-success-title" className="mt-2 text-base font-bold text-white">Deposit successful</h3>
                        <p className="mt-1 text-xs text-emerald-300">
                            {successAmount ? `$${Number.parseFloat(successAmount).toFixed(2)} added to your main wallet.` : 'Funds added to your main wallet.'}
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setSuccessOpen(false);
                                if (successAutoCloseRef.current) window.clearTimeout(successAutoCloseRef.current);
                            }}
                            className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white"
                        >
                            OK
                        </button>
                    </div>
                </div>
            ) : null}

            {errorOpen ? (
                <div className="fixed inset-0 z-[230] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="deposit-error-title">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/60"
                        aria-label="Close"
                        onClick={() => {
                            setErrorOpen(false);
                            if (errorAutoCloseRef.current) window.clearTimeout(errorAutoCloseRef.current);
                        }}
                    />
                    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-amber-400/25 bg-[#0b1220] p-5 text-center shadow-xl">
                        <p className="text-3xl" aria-hidden>
                            ⚠️
                        </p>
                        <h3 id="deposit-error-title" className="mt-2 text-base font-bold text-white">
                            Action failed
                        </h3>
                        <p className="mt-2 text-xs text-red-200">{errorMessage || 'Please try again.'}</p>
                        <button
                            type="button"
                            onClick={() => setErrorOpen(false)}
                            className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 px-4 py-2.5 text-sm font-semibold text-white"
                        >
                            OK
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

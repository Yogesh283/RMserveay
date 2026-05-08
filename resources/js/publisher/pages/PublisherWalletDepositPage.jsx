import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import PubButton from '../components/PubButton';
import PubCard from '../components/PubCard';
import PubInput from '../components/PubInput';
import PubPageFrame from '../components/PubPageFrame';
import PubPageHeader from '../components/PubPageHeader';
import PubSelect from '../components/PubSelect';
import { publisherGet, publisherPost } from '../lib/publisherApi';
import { pub } from '../ui/pubTheme';

const PAY_LABELS = {
    usdtbsc: 'USDT · BEP-20',
    usdttrc20: 'USDT · TRC20',
    usdterc20: 'USDT · ERC20',
};

function treasuryConfigured(data) {
    const raw = typeof data?.treasury_bep20_address === 'string' ? data.treasury_bep20_address.trim() : '';
    if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
        return false;
    }
    return !/^0x0+$/i.test(raw);
}

export default function PublisherWalletDepositPage() {
    const [info, setInfo] = useState(null);
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState(null);
    const [err, setErr] = useState(null);
    const [successOpen, setSuccessOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);
    const [errorOpen, setErrorOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const successAutoCloseRef = useRef(null);
    const errorAutoCloseRef = useRef(null);
    const AUTO_CLOSE_MS = 180000; // 3 minutes

    useEffect(() => {
        return () => {
            if (successAutoCloseRef.current) window.clearTimeout(successAutoCloseRef.current);
            if (errorAutoCloseRef.current) window.clearTimeout(errorAutoCloseRef.current);
        };
    }, []);

    function openSuccessPopup(message) {
        const m = message == null ? null : String(message);
        if (!m) return;
        setSuccessMessage(m);
        setSuccessOpen(true);
        if (successAutoCloseRef.current) window.clearTimeout(successAutoCloseRef.current);
        successAutoCloseRef.current = window.setTimeout(() => setSuccessOpen(false), AUTO_CLOSE_MS);
    }

    function openErrorPopup(message) {
        const m = message == null ? null : String(message);
        if (!m) return;
        setErrorMessage(m);
        setErrorOpen(true);
        if (errorAutoCloseRef.current) window.clearTimeout(errorAutoCloseRef.current);
        errorAutoCloseRef.current = window.setTimeout(() => setErrorOpen(false), AUTO_CLOSE_MS);
    }

    const [activeGateway, setActiveGateway] = useState('np');

    const [payCurrency, setPayCurrency] = useState('usdtbsc');
    const [npAmount, setNpAmount] = useState('');
    const [npBusy, setNpBusy] = useState(false);
    const [npErr, setNpErr] = useState(null);
    const [npPayment, setNpPayment] = useState(null);

    const [directAmount, setDirectAmount] = useState('');
    const [directTx, setDirectTx] = useState('');
    const [directBusy, setDirectBusy] = useState(false);
    const [directErr, setDirectErr] = useState(null);

    const load = useCallback(async () => {
        setErr(null);
        try {
            const [di, ov] = await Promise.all([
                publisherGet('publisher/wallet/deposit-info'),
                publisherGet('publisher/wallet/overview'),
            ]);
            setInfo(di.data);
            setBalance(ov.data.wallet_balance);
            const list = di.data?.nowpayments_pay_currencies;
            const def = di.data?.nowpayments_default_pay_currency || 'usdtbsc';
            if (Array.isArray(list) && list.length > 0) {
                setPayCurrency((c) => (list.includes(c) ? c : def));
            } else {
                setPayCurrency(def);
            }
        } catch (e) {
            const m = e.response?.data?.message ?? e.message ?? 'Could not load deposit info';
            setErr(m);
            openErrorPopup(m);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const npOn = !!info?.nowpayments_enabled;
    const directOn = treasuryConfigured(info);

    useEffect(() => {
        if (!info) {
            return;
        }
        if (npOn && directOn) {
            return;
        }
        if (npOn) {
            setActiveGateway('np');
            return;
        }
        if (directOn) {
            setActiveGateway('direct');
        }
    }, [info, npOn, directOn]);

    const showNpPanel = npOn && (!directOn || activeGateway === 'np');
    const showDirectPanel = directOn && (!npOn || activeGateway === 'direct');

    const minUsd = info ? Number.parseFloat(info.min_deposit_usd) || 1 : 1;
    const presets = [10, 25, 50, 100];
    const anyGateway = npOn || directOn;

    async function copyNpAddress() {
        if (!npPayment?.pay_address) return;
        try {
            await navigator.clipboard.writeText(npPayment.pay_address);
            setMsg('Deposit address copied.');
            window.setTimeout(() => setMsg(null), 2500);
        } catch {
            setErr('Could not copy — select and copy manually.');
        }
    }

    async function copyTreasury() {
        const addr = info?.treasury_bep20_address?.trim();
        if (!addr) return;
        try {
            await navigator.clipboard.writeText(addr);
            setMsg('Treasury address copied.');
            window.setTimeout(() => setMsg(null), 2500);
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
            const body = {
                amount_usd: Number.parseFloat(npAmount),
                pay_currency: payCurrency,
            };
            const { data } = await publisherPost('publisher/wallet/nowpayments/payment', body);
            setNpPayment(data);
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

    async function submitDirect(e) {
        e?.preventDefault?.();
        setDirectErr(null);
        setMsg(null);
        setDirectBusy(true);
        try {
            await publisherPost('publisher/wallet/deposit', {
                amount_usd: Number.parseFloat(directAmount),
                tx_hash: directTx.trim(),
            });
            setMsg('Deposit credited to your main wallet.');
            openSuccessPopup('Deposit credited to your main wallet.');
            setDirectAmount('');
            setDirectTx('');
            await load();
        } catch (e) {
            const msgs = e.response?.data?.errors;
            const flat =
                msgs && typeof msgs === 'object'
                    ? Object.values(msgs)
                          .flat()
                          .join(' ')
                    : null;
            const m = flat || e.response?.data?.message || e.message || 'Could not record deposit';
            setDirectErr(m);
            openErrorPopup(m);
        } finally {
            setDirectBusy(false);
        }
    }

    async function refreshNpStatus() {
        if (!npPayment?.payment_id) return;
        setNpErr(null);
        try {
            const { data } = await publisherGet(`publisher/wallet/nowpayments/${npPayment.payment_id}`);
            const local = data.local ?? {};
            if (local.credited) {
                setMsg('Deposit credited to your main wallet.');
                openSuccessPopup('Deposit credited to your main wallet.');
                setNpPayment(null);
                await load();
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
            const m = e.response?.data?.message ?? e.message ?? 'Status check failed';
            setNpErr(m);
            openErrorPopup(m);
        }
    }

    useEffect(() => {
        const pid = npPayment?.payment_id;
        if (!pid) return undefined;

        let cancelled = false;

        async function tick() {
            try {
                const { data } = await publisherGet(`publisher/wallet/nowpayments/${pid}`);
                if (cancelled) return;
                const local = data.local ?? {};
                if (local.credited) {
                    setMsg('Deposit credited to your main wallet.');
                    openSuccessPopup('Deposit credited to your main wallet.');
                    setNpPayment(null);
                    await load();
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
                    const m = e.response?.data?.message ?? e.message ?? 'Status check failed';
                    setNpErr(m);
                    openErrorPopup(m);
                }
            }
        }

        const t = window.setInterval(() => void tick(), 12000);
        void tick();

        return () => {
            cancelled = true;
            window.clearInterval(t);
        };
    }, [npPayment?.payment_id, load]);

    if (loading) {
        return (
            <PubPageFrame>
                <p className={`py-16 text-center text-sm ${pub.muted}`}>Loading…</p>
            </PubPageFrame>
        );
    }

    return (
        <PubPageFrame>
            <PubPageHeader
                title="Deposit"
                subtitle="Choose a payment gateway — crypto checkout or direct on-chain USDT to treasury."
            />

            {err && !info ? (
                <PubCard className="border-red-500/30 p-6">
                    <p className="text-red-400">{err}</p>
                </PubCard>
            ) : null}

            {balance !== null && (
                <PubCard className="p-5">
                    <p className={`text-sm font-medium ${pub.muted}`}>Main wallet balance</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">${Number.parseFloat(balance).toFixed(2)} USDT</p>
                </PubCard>
            )}

            {msg ? <p className="text-sm font-medium text-emerald-400">{msg}</p> : null}
            {err && info ? <p className="text-sm text-red-400">{err}</p> : null}

            {npOn && directOn ? (
                <PubCard className="p-4">
                    <p className={pub.label}>Payment gateway</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveGateway('np')}
                            className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                                activeGateway === 'np'
                                    ? 'border-[#7C5CFF] bg-gradient-to-r from-[#6C4CF1]/25 to-[#8E6BFF]/20 text-white shadow-[0_0_20px_rgba(124,92,255,0.2)]'
                                    : 'border-[#2A3550] bg-[#1A2235] text-[#9CA3AF] hover:border-[#7C5CFF]/40 hover:text-white'
                            }`}
                        >
                            NOWPayments
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveGateway('direct')}
                            className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                                activeGateway === 'direct'
                                    ? 'border-[#7C5CFF] bg-gradient-to-r from-[#6C4CF1]/25 to-[#8E6BFF]/20 text-white shadow-[0_0_20px_rgba(124,92,255,0.2)]'
                                    : 'border-[#2A3550] bg-[#1A2235] text-[#9CA3AF] hover:border-[#7C5CFF]/40 hover:text-white'
                            }`}
                        >
                            Direct USDT
                        </button>
                    </div>
                </PubCard>
            ) : null}

            {showNpPanel ? (
                <PubCard className="p-6 sm:p-8">
                    <h2 className="text-lg font-semibold text-white">NOWPayments</h2>
                    {!npPayment ? (
                        <form onSubmit={createNowPayment} className="mt-6 space-y-4">
                            <PubInput
                                label="Amount (USD value)"
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={npAmount}
                                onChange={(ev) => setNpAmount(ev.target.value)}
                            />
                            {info?.nowpayments_pay_currencies?.length > 0 ? (
                                <PubSelect label="Pay with" className="w-full max-w-md" value={payCurrency} onChange={(ev) => setPayCurrency(ev.target.value)}>
                                    {info.nowpayments_pay_currencies.map((c) => (
                                        <option key={c} value={c}>
                                            {PAY_LABELS[c] ?? c}
                                        </option>
                                    ))}
                                </PubSelect>
                            ) : null}
                            <div>
                                <p className={`mb-2 text-[11px] font-semibold uppercase tracking-wider ${pub.muted}`}>Quick amount</p>
                                <div className="flex flex-wrap gap-2">
                                    {presets.map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setNpAmount(String(n))}
                                            disabled={n < minUsd}
                                            className="rounded-xl border border-[#2A3550] bg-[#1A2235] px-3 py-2 text-xs font-bold tabular-nums text-white transition hover:border-[#7C5CFF]/45 disabled:cursor-not-allowed disabled:opacity-35"
                                        >
                                            ${n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <PubButton type="submit" disabled={npBusy}>
                                {npBusy ? 'Creating…' : 'Create payment'}
                            </PubButton>
                            {npErr ? <p className="text-sm text-red-400">{npErr}</p> : null}
                        </form>
                    ) : (
                        <div className="mt-6 space-y-4">
                            <p className={`text-sm ${pub.muted}`}>
                                Send exactly <strong className="tabular-nums text-emerald-400">{npPayment.pay_amount}</strong> {npPayment.pay_currency} to the address below (or scan QR).
                            </p>
                            {npPayment.pay_address ? (
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                    <div className="rounded-lg border border-[#2A3550] bg-[#1A2235] p-3">
                                        <QRCodeSVG value={npPayment.pay_address} size={160} level="M" includeMargin />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="break-all rounded-xl border border-[#2A3550] bg-[#1A2235] px-4 py-3 font-mono text-sm text-emerald-200">
                                            {npPayment.pay_address}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <PubButton type="button" variant="secondary" onClick={copyNpAddress}>
                                                Copy address
                                            </PubButton>
                                            <PubButton type="button" onClick={refreshNpStatus}>
                                                Refresh status
                                            </PubButton>
                                            <button
                                                type="button"
                                                onClick={() => setNpPayment(null)}
                                                className="rounded-xl border border-[#2A3550] bg-[#111827] px-4 py-2 text-sm font-medium text-[#9CA3AF] transition hover:border-[#7C5CFF]/40 hover:text-white"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                            {npErr ? <p className="text-sm text-red-400">{npErr}</p> : null}
                        </div>
                    )}
                </PubCard>
            ) : null}

            {showDirectPanel ? (
                <PubCard className="p-6 sm:p-8">
                    <h2 className="text-lg font-semibold text-white">Direct USDT deposit</h2>
                    <p className={`mt-1 text-sm ${pub.muted}`}>
                        Send <strong className="text-white/90">{info.asset ?? 'USDT'}</strong> on{' '}
                        <strong className="text-white/90">{info.network ?? 'BEP-20'}</strong> to the treasury below, then submit your transaction hash. Minimum: $
                        {info.min_deposit_usd}.
                    </p>
                    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="rounded-lg border border-[#2A3550] bg-[#1A2235] p-3">
                            <QRCodeSVG value={info.treasury_bep20_address} size={160} level="M" includeMargin />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="break-all rounded-xl border border-[#2A3550] bg-[#1A2235] px-4 py-3 font-mono text-sm text-emerald-200">
                                {info.treasury_bep20_address}
                            </div>
                            <PubButton type="button" variant="secondary" onClick={copyTreasury}>
                                Copy treasury address
                            </PubButton>
                        </div>
                    </div>
                    <form onSubmit={submitDirect} className="mt-6 space-y-4">
                        <PubInput
                            label="Amount sent (USD)"
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={directAmount}
                            onChange={(ev) => setDirectAmount(ev.target.value)}
                        />
                        <PubInput
                            label="Transaction hash"
                            placeholder="0x followed by 64 hex characters"
                            value={directTx}
                            onChange={(ev) => setDirectTx(ev.target.value)}
                            autoComplete="off"
                        />
                        <PubButton type="submit" disabled={directBusy}>
                            {directBusy ? 'Submitting…' : 'Submit deposit'}
                        </PubButton>
                        {directErr ? <p className="text-sm text-red-400">{directErr}</p> : null}
                    </form>
                </PubCard>
            ) : null}

            {info && !anyGateway ? (
                <PubCard className="p-6">
                    <p className={`text-sm ${pub.muted}`}>
                        No deposit gateways are configured. Enable NOWPayments or set <span className="font-mono text-white/80">WALLET_TREASURY_BEP20</span> in your environment.
                        Minimum when enabled: ${info.min_deposit_usd}.
                    </p>
                </PubCard>
            ) : null}

            {successOpen ? (
                <div className="fixed inset-0 z-[240] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/60"
                        aria-label="Close"
                        onClick={() => {
                            setSuccessOpen(false);
                            if (successAutoCloseRef.current) window.clearTimeout(successAutoCloseRef.current);
                        }}
                    />
                    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-emerald-400/25 bg-[#0b1220] p-5 text-center shadow-xl backdrop-blur-xl">
                        <p className="text-3xl" aria-hidden>
                            ✅
                        </p>
                        <h3 className="mt-2 text-base font-bold text-white">Deposit successful</h3>
                        <p className="mt-1 text-xs text-emerald-300">{successMessage || 'Funds added to your wallet.'}</p>
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
                <div className="fixed inset-0 z-[250] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/60"
                        aria-label="Close"
                        onClick={() => {
                            setErrorOpen(false);
                            if (errorAutoCloseRef.current) window.clearTimeout(errorAutoCloseRef.current);
                        }}
                    />
                    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-amber-400/25 bg-[#0b1220] p-5 text-center shadow-xl backdrop-blur-xl">
                        <p className="text-3xl" aria-hidden>
                            ⚠️
                        </p>
                        <h3 className="mt-2 text-base font-bold text-white">Action failed</h3>
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

        </PubPageFrame>
    );
}

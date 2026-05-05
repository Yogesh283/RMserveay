import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import PubButton from '../components/PubButton';
import PubCard from '../components/PubCard';
import PubInput from '../components/PubInput';
import PubPageHeader from '../components/PubPageHeader';
import { publisherGet, publisherPost } from '../lib/publisherApi';
import { pub } from '../ui/pubTheme';

export default function PublisherWalletDepositPage() {
    const [info, setInfo] = useState(null);
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState(null);
    const [err, setErr] = useState(null);

    const [npAmount, setNpAmount] = useState('');
    const [npBusy, setNpBusy] = useState(false);
    const [npErr, setNpErr] = useState(null);
    const [npPayment, setNpPayment] = useState(null);

    const load = useCallback(async () => {
        setErr(null);
        try {
            const [di, ov] = await Promise.all([
                publisherGet('publisher/wallet/deposit-info'),
                publisherGet('publisher/wallet/overview'),
            ]);
            setInfo(di.data);
            setBalance(ov.data.wallet_balance);
        } catch (e) {
            setErr(e.response?.data?.message ?? e.message ?? 'Could not load deposit info');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

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

    async function createNowPayment(e) {
        e?.preventDefault?.();
        setNpErr(null);
        setMsg(null);
        setNpBusy(true);
        try {
            const { data } = await publisherPost('publisher/wallet/nowpayments/payment', {
                amount_usd: Number.parseFloat(npAmount),
            });
            setNpPayment(data);
            setNpAmount('');
        } catch (e) {
            const m = e.response?.data?.message ?? e.response?.data?.errors ?? e.response?.data?.details;
            setNpErr(typeof m === 'object' ? JSON.stringify(m) : (m ?? 'Request failed'));
        } finally {
            setNpBusy(false);
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
            setNpErr(e.response?.data?.message ?? e.message ?? 'Status check failed');
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
    }, [npPayment?.payment_id, load]);

    if (loading) {
        return <p className={`py-16 text-center text-sm ${pub.muted}`}>Loading…</p>;
    }

    return (
        <div className="space-y-8">
            <PubPageHeader title="Deposit" subtitle="Top up your publisher wallet via NOWPayments when enabled." />

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

            {info?.nowpayments_enabled ? (
                <PubCard className="p-6 sm:p-8">
                    <h2 className="text-lg font-semibold text-white">NOWPayments (crypto checkout)</h2>
                    {!npPayment ? (
                        <form onSubmit={createNowPayment} className="mt-6 flex flex-wrap items-end gap-3">
                            <PubInput
                                label="Amount (USD value)"
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={npAmount}
                                onChange={(ev) => setNpAmount(ev.target.value)}
                            />
                            <PubButton type="submit" disabled={npBusy}>
                                {npBusy ? 'Creating…' : 'Create payment'}
                            </PubButton>
                            {npErr ? <p className="w-full text-sm text-red-400">{npErr}</p> : null}
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
                                                className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white"
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
            ) : (
                info && (
                    <PubCard className="p-6">
                        <p className={`text-sm ${pub.muted}`}>Crypto checkout is not enabled. Minimum when enabled: ${info.min_deposit_usd}.</p>
                    </PubCard>
                )
            )}
        </div>
    );
}

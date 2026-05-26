import { useCallback, useEffect, useMemo, useState } from 'react';
import { prepareSanctum } from '../../lib/auth';
import WalletFlowShell, { walletFlowGlass, walletFlowInput, walletFlowLabel, walletFlowPrimaryBtn } from '../components/WalletFlowShell';

function fmtUsd(s) {
    const n = Number.parseFloat(s);
    if (Number.isNaN(n)) return s;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function MemberWalletWithdrawPage() {
    const [overview, setOverview] = useState(null);
    const [walletSource, setWalletSource] = useState('main');
    const [amount, setAmount] = useState('');
    const [address, setAddress] = useState('');
    const [otp, setOtp] = useState('');
    const [saveAddress, setSaveAddress] = useState(true);
    const [busy, setBusy] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [msg, setMsg] = useState(null);
    const [err, setErr] = useState(null);

    const load = useCallback(async () => {
        try {
            await prepareSanctum();
            const { data } = await window.axios.get('api/member/wallet/overview');
            setOverview(data);
            if (data.withdrawal_address) {
                setAddress(data.withdrawal_address);
            }
        } catch (e) {
            setErr(e.response?.data?.message ?? e.message);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const feeRateStr =
        walletSource === 'survey'
            ? (overview?.limits?.survey_withdrawal_fee_rate ?? '0.15')
            : (overview?.limits?.direct_withdrawal_fee_rate ?? '0.15');
    const minWithdraw = overview?.limits?.min_withdraw_usd ?? '10';
    const feePercentLabel = useMemo(() => {
        const r = Number.parseFloat(feeRateStr);
        const rate = Number.isNaN(r) ? 0 : r;
        if (rate <= 0) return '0%';
        return `${(rate * 100).toFixed(0)}%`;
    }, [feeRateStr]);
    const feePreview = useMemo(() => {
        const gross = Number.parseFloat(amount);
        if (Number.isNaN(gross) || gross <= 0) return null;
        const r = Number.parseFloat(feeRateStr);
        const rate = Number.isNaN(r) ? 0 : r;
        const fee = gross * rate;
        const net = gross - fee;
        return { fee, net, rate };
    }, [amount, feeRateStr]);

    async function submit(e) {
        e.preventDefault();
        setErr(null);
        setMsg(null);
        setBusy(true);
        try {
            await prepareSanctum();
            const { data } = await window.axios.post('api/member/wallet/withdraw', {
                amount_usd: Number.parseFloat(amount),
                wallet_source: walletSource,
                bep20_address: address.trim(),
                save_address: saveAddress,
                otp: otp.trim(),
            });
            setMsg(data.message ?? 'Submitted.');
            setOverview((o) =>
                o
                    ? {
                          ...o,
                          wallet_balance: data.wallet_balance ?? o.wallet_balance,
                          survey_wallet_balance: data.survey_wallet_balance ?? o.survey_wallet_balance,
                          p2p_wallet_balance: data.p2p_wallet_balance ?? o.p2p_wallet_balance,
                      }
                    : o,
            );
            setAmount('');
            setOtp('');
            setOtpSent(false);
            await load();
        } catch (e) {
            const m = e.response?.data?.message ?? e.response?.data?.errors;
            setErr(typeof m === 'object' ? JSON.stringify(m) : (m ?? 'Request failed'));
        } finally {
            setBusy(false);
        }
    }

    async function sendOtp() {
        setErr(null);
        setMsg(null);
        setSendingOtp(true);
        try {
            await prepareSanctum();
            const { data } = await window.axios.post('api/member/wallet/withdraw/otp');
            setOtpSent(true);
            setMsg(data?.message ?? 'OTP sent to your email.');
        } catch (e) {
            const m = e.response?.data?.message ?? e.response?.data?.errors;
            setErr(typeof m === 'object' ? JSON.stringify(m) : (m ?? 'Could not send OTP'));
        } finally {
            setSendingOtp(false);
        }
    }

    const glass = walletFlowGlass;

    return (
        <WalletFlowShell overview={overview} bannerSuccess={msg} bannerError={err} footerTag="Wallet · Withdraw">
            <section className={`relative mt-4 overflow-hidden p-4 sm:p-5 ${glass}`}>
                <div className="pointer-events-none absolute -right-6 top-0 h-28 w-28 rounded-full bg-violet-500/15 blur-2xl" aria-hidden />

                <div className="relative border-b border-white/10 pb-3 mb-3">
                    <p className={walletFlowLabel}>Withdraw from</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setWalletSource('main')}
                            className={`rounded-xl border px-3 py-2 text-left transition ${
                                walletSource === 'main'
                                    ? 'border-violet-400/50 bg-violet-500/15 text-white'
                                    : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20'
                            }`}
                        >
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Main wallet</span>
                            <span className="mt-0.5 block text-sm font-bold tabular-nums text-white">
                                {overview ? fmtUsd(overview.wallet_balance) : '—'}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setWalletSource('survey')}
                            className={`rounded-xl border px-3 py-2 text-left transition ${
                                walletSource === 'survey'
                                    ? 'border-cyan-400/50 bg-cyan-500/15 text-white'
                                    : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20'
                            }`}
                        >
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Survey wallet</span>
                            <span className="mt-0.5 block text-sm font-bold tabular-nums text-white">
                                {overview ? fmtUsd(overview.survey_wallet_balance) : '—'}
                            </span>
                        </button>
                    </div>
                    {overview?.limits ? (
                        <p className="mt-1 text-[11px] text-slate-500">
                            Min. withdrawal <span className="font-semibold text-slate-400">${minWithdraw}</span> USDT · Fee {feePercentLabel}
                            {' · '}
                            {walletSource === 'survey' ? 'Survey wallet' : 'Main wallet'}
                        </p>
                    ) : null}
                </div>

                <form onSubmit={submit} className="relative space-y-3">
                    {feePreview ? (
                        <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                            Gross{' '}
                            <strong className="tabular-nums text-white">${(feePreview.net + feePreview.fee).toFixed(2)}</strong>
                            {' · '}
                            Fee <strong className="tabular-nums text-amber-400">${feePreview.fee.toFixed(2)}</strong>
                            {' · '}
                            Est. net <strong className="tabular-nums text-emerald-400">${feePreview.net.toFixed(2)}</strong>
                        </div>
                    ) : null}

                    <div>
                        <label className={walletFlowLabel}>
                            Amount (USDT, from {walletSource === 'survey' ? 'survey' : 'main'} wallet)
                        </label>
                        <input type="number" step="0.01" min="0" required value={amount} onChange={(ev) => setAmount(ev.target.value)} className={`mt-1 ${walletFlowInput} tabular-nums`} />
                    </div>
                    <div>
                        <label className={walletFlowLabel}>BEP-20 address</label>
                        <input
                            type="text"
                            required
                            value={address}
                            onChange={(ev) => setAddress(ev.target.value)}
                            className={`mt-1 font-mono ${walletFlowInput} text-sm`}
                            placeholder="0x…"
                        />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-400">
                        <input type="checkbox" checked={saveAddress} onChange={(ev) => setSaveAddress(ev.target.checked)} className="rounded border-white/20 bg-slate-950" />
                        Save address for next time
                    </label>

                    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className={walletFlowLabel}>Withdrawal OTP</label>
                            <button
                                type="button"
                                onClick={sendOtp}
                                disabled={sendingOtp}
                                className="rounded-lg border border-violet-300/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-200 transition hover:border-violet-300/55 disabled:opacity-50"
                            >
                                {sendingOtp ? 'Sending…' : otpSent ? 'Resend OTP' : 'Send OTP'}
                            </button>
                        </div>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            required
                            value={otp}
                            onChange={(ev) => setOtp(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                            className={`mt-1 ${walletFlowInput} tracking-[0.35em] text-center font-semibold`}
                            placeholder="000000"
                        />
                        <p className="mt-1 text-[11px] text-slate-500">Enter the 6-digit OTP sent to your account email before submitting withdrawal.</p>
                    </div>

                    <button type="submit" disabled={busy} className={`${walletFlowPrimaryBtn} disabled:opacity-50`}>
                        {busy ? 'Submitting…' : 'Submit withdrawal'}
                    </button>
                </form>
            </section>
        </WalletFlowShell>
    );
}

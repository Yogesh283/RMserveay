import { useCallback, useEffect, useMemo, useState } from 'react';
import { prepareSanctum } from '../../lib/auth';
import WalletFlowShell, {
    walletFlowGhostBtn,
    walletFlowGlass,
    walletFlowGlassSoft,
    walletFlowInput,
    walletFlowLabel,
    walletFlowModalSurface,
    walletFlowPrimaryBtn,
    walletFlowSecondaryBtn,
} from '../components/WalletFlowShell';

function fmtUsd(s) {
    const n = Number.parseFloat(s);
    if (Number.isNaN(n)) return s;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtWhen(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
        return iso;
    }
}

export default function MemberWalletInternalTransferPage() {
    const [overview, setOverview] = useState(null);
    const [mainAmt, setMainAmt] = useState('');
    const [p2pAmt, setP2pAmt] = useState('');
    const [busy1, setBusy1] = useState(false);
    const [busy2, setBusy2] = useState(false);
    const [mainErr, setMainErr] = useState(null);
    const [p2pErr, setP2pErr] = useState(null);
    const [mainConfirmOpen, setMainConfirmOpen] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [lastMainTransfer, setLastMainTransfer] = useState(null);
    const [overviewErr, setOverviewErr] = useState(null);

    const load = useCallback(async () => {
        try {
            setOverviewErr(null);
            const { data } = await window.axios.get('api/member/wallet/overview');
            setOverview(data);
        } catch (e) {
            setOverviewErr(e.response?.data?.message ?? e.message);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const bonusRate = overview?.limits?.main_to_p2p_bonus_rate ?? '0.10';
    const preview = useMemo(() => {
        const a = Number.parseFloat(mainAmt);
        if (Number.isNaN(a) || a <= 0) return null;
        const b = Number.parseFloat(bonusRate);
        const bonus = a * (Number.isNaN(b) ? 0.1 : b);
        const total = a + bonus;
        return { bonus, total };
    }, [mainAmt, bonusRate]);

    function openMainConfirm() {
        setMainErr(null);
        const a = Number.parseFloat(mainAmt);
        if (Number.isNaN(a) || a <= 0) {
            setMainErr('Enter a valid amount greater than zero.');
            return;
        }
        if (overview && a > Number.parseFloat(overview.wallet_balance)) {
            setMainErr('Amount exceeds your main wallet balance.');
            return;
        }
        setConfirmPassword('');
        setMainConfirmOpen(true);
    }

    function closeMainConfirm() {
        setMainConfirmOpen(false);
        setConfirmPassword('');
    }

    useEffect(() => {
        if (!mainConfirmOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') closeMainConfirm();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [mainConfirmOpen]);

    async function submitMainToP2pConfirmed(e) {
        e.preventDefault();
        setMainErr(null);
        setBusy1(true);
        try {
            await prepareSanctum();
            const { data } = await window.axios.post('api/member/wallet/main-to-p2p', {
                amount_usd: Number.parseFloat(mainAmt),
                password: confirmPassword,
            });
            setLastMainTransfer({
                message: data.message,
                transaction: data.transaction,
                bonus_usd: data.bonus_usd,
                total_credited_p2p_usd: data.total_credited_p2p_usd,
            });
            setMainAmt('');
            closeMainConfirm();
            await load();
        } catch (e) {
            const errs = e.response?.data?.errors;
            const pwMsg = errs?.password?.[0];
            const m = pwMsg ?? e.response?.data?.message ?? errs;
            setMainErr(typeof m === 'object' ? JSON.stringify(m) : (m ?? 'Failed'));
        } finally {
            setBusy1(false);
        }
    }

    async function submitP2pToMain(e) {
        e.preventDefault();
        setP2pErr(null);
        const a = Number.parseFloat(p2pAmt);
        if (Number.isNaN(a) || a <= 0) {
            setP2pErr('Enter a valid amount greater than zero.');
            return;
        }
        if (overview && a > Number.parseFloat(overview.p2p_wallet_balance)) {
            setP2pErr('Amount exceeds your P2P wallet balance.');
            return;
        }
        setBusy2(true);
        try {
            await prepareSanctum();
            await window.axios.post('api/member/wallet/p2p-to-main', {
                amount_usd: a,
            });
            setP2pErr(null);
            setMainErr(null);
            setP2pAmt('');
            await load();
        } catch (e) {
            const errs = e.response?.data?.errors;
            const amountMsg = errs?.amount_usd?.[0];
            const m = amountMsg ?? e.response?.data?.message ?? errs;
            setP2pErr(typeof m === 'object' ? JSON.stringify(m) : (m ?? 'Failed'));
        } finally {
            setBusy2(false);
        }
    }

    const tx = lastMainTransfer?.transaction;
    const glass = walletFlowGlass;
    const soft = walletFlowGlassSoft;

    return (
        <WalletFlowShell overview={overview} loadError={overviewErr} footerTag="Wallet · Main ↔ P2P">
            {lastMainTransfer && tx ? (
                <section className={`relative mt-4 overflow-hidden border border-emerald-500/35 bg-emerald-950/25 p-3 text-xs text-emerald-100 ${soft}`} role="status" aria-live="polite">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold text-emerald-200">{lastMainTransfer.message}</p>
                        <button type="button" onClick={() => setLastMainTransfer(null)} className="shrink-0 font-semibold text-emerald-300 underline underline-offset-2">
                            Dismiss
                        </button>
                    </div>
                    <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                        <div className="flex justify-between gap-2 sm:block">
                            <dt className="text-slate-500">Time</dt>
                            <dd className="text-white">{fmtWhen(tx.created_at)}</dd>
                        </div>
                        <div className="flex justify-between gap-2 sm:block">
                            <dt className="text-slate-500">Debited</dt>
                            <dd className="font-semibold tabular-nums text-white">{fmtUsd(tx.amount_debited_main_usd)}</dd>
                        </div>
                        <div className="flex justify-between gap-2 sm:block">
                            <dt className="text-slate-500">Bonus</dt>
                            <dd className="font-semibold tabular-nums text-white">{fmtUsd(tx.bonus_usd)}</dd>
                        </div>
                        <div className="flex justify-between gap-2 sm:block">
                            <dt className="text-slate-500">Credited P2P</dt>
                            <dd className="font-semibold tabular-nums text-emerald-400">{fmtUsd(tx.total_credited_p2p_usd)}</dd>
                        </div>
                    </dl>
                </section>
            ) : null}

            <section className={`relative mt-4 overflow-hidden p-4 sm:p-5 ${glass}`}>
                <div className="pointer-events-none absolute -right-6 top-0 h-24 w-24 rounded-full bg-violet-500/15 blur-2xl" aria-hidden />

                <p className={walletFlowLabel}>Main → P2P (bonus)</p>
                {preview ? (
                    <p className="mt-1 text-xs text-emerald-300/90">
                        ≈ {fmtUsd(preview.bonus)} bonus · {fmtUsd(preview.total)} to P2P
                    </p>
                ) : null}
                <div className="mt-3 space-y-2">
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="Amount (USDT)"
                        value={mainAmt}
                        onChange={(e) => setMainAmt(e.target.value)}
                        className={`${walletFlowInput} tabular-nums`}
                    />
                    {mainErr && !mainConfirmOpen ? <p className="text-xs text-red-400">{mainErr}</p> : null}
                    <button type="button" onClick={openMainConfirm} className={walletFlowPrimaryBtn}>
                        Continue (password)
                    </button>
                </div>

                <div className="my-4 border-t border-white/10" />

                <p className={walletFlowLabel}>P2P → Main (1:1)</p>
                <form onSubmit={submitP2pToMain} className="mt-3 space-y-2">
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="Amount (USDT)"
                        value={p2pAmt}
                        onChange={(e) => setP2pAmt(e.target.value)}
                        className={`${walletFlowInput} tabular-nums`}
                    />
                    {p2pErr ? <p className="text-xs text-red-400">{p2pErr}</p> : null}
                    <button type="submit" disabled={busy2} className={`${walletFlowGhostBtn} w-full border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50`}>
                        {busy2 ? '…' : 'Move to main'}
                    </button>
                </form>
            </section>

            {mainConfirmOpen ? (
                <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="main-p2p-confirm-title">
                    <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close" onClick={closeMainConfirm} />
                    <div className={walletFlowModalSurface}>
                        <h2 id="main-p2p-confirm-title" className="text-base font-bold text-white">
                            Confirm Main → P2P
                        </h2>
                        <p className="mt-1 text-xs text-slate-400">Enter your login password.</p>
                        {preview ? (
                            <ul className="mt-3 space-y-1 rounded-xl border border-white/10 bg-black/25 p-2 text-xs">
                                <li className="flex justify-between gap-2">
                                    <span className="text-slate-500">From main</span>
                                    <span className="font-semibold tabular-nums text-white">{fmtUsd(Number.parseFloat(mainAmt))}</span>
                                </li>
                                <li className="flex justify-between gap-2">
                                    <span className="text-slate-500">Bonus</span>
                                    <span className="font-semibold tabular-nums text-white">{fmtUsd(preview.bonus)}</span>
                                </li>
                                <li className="flex justify-between gap-2 border-t border-white/10 pt-1 font-semibold">
                                    <span className="text-white">To P2P</span>
                                    <span className="tabular-nums text-emerald-400">{fmtUsd(preview.total)}</span>
                                </li>
                            </ul>
                        ) : null}
                        <form onSubmit={submitMainToP2pConfirmed} className="mt-3 space-y-2">
                            <label className="block">
                                <span className={walletFlowLabel}>Password</span>
                                <input
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`mt-1 ${walletFlowInput} text-sm`}
                                />
                            </label>
                            {mainErr && mainConfirmOpen ? <p className="text-xs text-red-400">{mainErr}</p> : null}
                            <div className="flex flex-wrap gap-2 pt-1">
                                <button type="button" onClick={closeMainConfirm} className={walletFlowSecondaryBtn}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={busy1} className={`${walletFlowPrimaryBtn} !w-auto px-6 disabled:opacity-50`}>
                                    {busy1 ? '…' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </WalletFlowShell>
    );
}

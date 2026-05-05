import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
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

/** Mirrors `User::parseP2pReceivePayload` — only fetch lookup when this returns non-null. */
const P2P_QR_PREFIX = 'rms:p2p:';
function parseP2pReceivePayload(raw) {
    const s = raw.trim();
    if (!s) return null;
    let code;
    if (s.toLowerCase().startsWith(P2P_QR_PREFIX)) {
        code = s.slice(P2P_QR_PREFIX.length).toUpperCase();
    } else {
        code = s.toUpperCase();
    }
    return /^RMS[A-Z0-9]{12}$/.test(code) ? code : null;
}

export default function MemberWalletP2pPage() {
    const [overview, setOverview] = useState(null);
    const [amount, setAmount] = useState('');
    const [recipientMode, setRecipientMode] = useState('p2p_code');
    const [recipientP2p, setRecipientP2p] = useState('');
    const [recipientLoginUid, setRecipientLoginUid] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);
    const [msg, setMsg] = useState(null);
    const [camOpen, setCamOpen] = useState(false);
    const scannerRef = useRef(null);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [confirmErr, setConfirmErr] = useState(null);
    const [lastTransfer, setLastTransfer] = useState(null);
    const [p2pRecipientPreview, setP2pRecipientPreview] = useState(null);
    const [p2pLookupErr, setP2pLookupErr] = useState(null);

    const load = useCallback(async () => {
        try {
            setErr(null);
            await prepareSanctum();
            const { data } = await window.axios.get('api/member/wallet/overview');
            setOverview(data);
        } catch (e) {
            setErr(e.response?.data?.message ?? e.message ?? 'Failed to load');
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (recipientMode !== 'p2p_code') {
            setP2pRecipientPreview(null);
            setP2pLookupErr(null);
            return;
        }
        const raw = recipientP2p.trim();
        if (!raw || parseP2pReceivePayload(raw) === null) {
            setP2pRecipientPreview(null);
            setP2pLookupErr(null);
            return;
        }
        let cancelled = false;
        const timer = window.setTimeout(async () => {
            try {
                await prepareSanctum();
                const { data } = await window.axios.get('api/member/wallet/p2p-recipient-lookup', {
                    params: { code: raw },
                });
                if (!cancelled) {
                    setP2pRecipientPreview(data);
                    setP2pLookupErr(null);
                }
            } catch (e) {
                if (!cancelled) {
                    setP2pRecipientPreview(null);
                    const errs = e.response?.data?.errors;
                    const codeMsg = errs?.code?.[0];
                    const m = codeMsg ?? e.response?.data?.message;
                    setP2pLookupErr(typeof m === 'string' ? m : null);
                }
            }
        }, 380);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [recipientP2p, recipientMode]);

    const stopScan = useCallback(async () => {
        const h = scannerRef.current;
        scannerRef.current = null;
        if (h) {
            try {
                await h.stop();
            } catch {
                /* already stopped */
            }
            try {
                h.clear();
            } catch {
                /* */
            }
        }
        setCamOpen(false);
    }, []);

    useEffect(() => {
        if (!camOpen) {
            return undefined;
        }

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            try {
                const h = new Html5Qrcode('p2p-inline-qr-region', { verbose: false });
                if (cancelled) {
                    return;
                }
                scannerRef.current = h;
                await h.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 220, height: 220 } },
                    (decodedText) => {
                        setRecipientP2p(decodedText);
                        setRecipientMode('p2p_code');
                        stopScan();
                    },
                    () => {},
                );
            } catch (e) {
                if (!cancelled) {
                    setErr(e?.message ?? 'Camera failed — paste code manually.');
                    setCamOpen(false);
                }
            }
        }, 150);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            const h = scannerRef.current;
            scannerRef.current = null;
            if (h) {
                h.stop().catch(() => {});
                try {
                    h.clear();
                } catch {
                    /* */
                }
            }
        };
    }, [camOpen, stopScan]);

    function startScan() {
        setErr(null);
        setCamOpen(true);
    }

    function buildTransferPayload() {
        const a = Number.parseFloat(amount);
        if (Number.isNaN(a) || a <= 0) {
            return { error: 'Enter a valid amount greater than zero.' };
        }
        const body = { amount_usd: a };
        if (recipientMode === 'p2p_code') {
            const t = recipientP2p.trim();
            if (!t) {
                return { error: 'Scan recipient QR or paste their P2P code.' };
            }
            body.recipient_p2p_code = t;
        } else {
            const u = recipientLoginUid.trim();
            if (!u) {
                return { error: 'Enter recipient user ID.' };
            }
            body.recipient_login_uid = u;
        }
        return { body };
    }

    function recipientSummaryLabel() {
        if (recipientMode === 'p2p_code') {
            const t = recipientP2p.trim();
            if (!t) return '—';
            if (p2pRecipientPreview?.name) {
                return `${p2pRecipientPreview.name} · ${p2pRecipientPreview.login_uid}`;
            }
            if (p2pRecipientPreview?.login_uid) {
                return p2pRecipientPreview.login_uid;
            }
            return t.length > 36 ? `${t.slice(0, 18)}…` : t;
        }
        return recipientLoginUid.trim() ? `User ID: ${recipientLoginUid.trim()}` : '—';
    }

    function openConfirm() {
        setErr(null);
        setConfirmErr(null);
        const built = buildTransferPayload();
        if (built.error) {
            setErr(built.error);
            return;
        }
        setConfirmPassword('');
        setConfirmOpen(true);
    }

    function closeConfirm() {
        setConfirmOpen(false);
        setConfirmPassword('');
        setConfirmErr(null);
    }

    useEffect(() => {
        if (!confirmOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') closeConfirm();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [confirmOpen]);

    async function submitConfirmed(e) {
        e.preventDefault();
        setConfirmErr(null);
        const built = buildTransferPayload();
        if (built.error || !built.body) {
            setConfirmErr(built.error ?? 'Invalid form.');
            return;
        }
        setBusy(true);
        try {
            await prepareSanctum();
            const { data } = await window.axios.post('api/member/wallet/p2p-transfer', {
                ...built.body,
                password: confirmPassword,
            });
            setMsg(null);
            setErr(null);
            setLastTransfer(data);
            setAmount('');
            setRecipientP2p('');
            setRecipientLoginUid('');
            closeConfirm();
            await load();
        } catch (e) {
            const errs = e.response?.data?.errors;
            const pwMsg = errs?.password?.[0];
            const first =
                pwMsg ??
                errs?.recipient_p2p_code?.[0] ??
                errs?.recipient?.[0] ??
                errs?.amount_usd?.[0] ??
                e.response?.data?.message;
            setConfirmErr(typeof first === 'string' ? first : 'Transfer failed.');
        } finally {
            setBusy(false);
        }
    }

    async function copyText(text) {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setMsg('Copied.');
            setTimeout(() => setMsg(null), 2000);
        } catch {
            setErr('Could not copy.');
        }
    }

    const minP2p = overview?.limits?.min_p2p_usd ?? '0.01';
    const qrPayload = overview?.p2p_receive_qr_payload ?? '';
    const code = overview?.p2p_receive_code ?? '';

    const amtNum = Number.parseFloat(amount);
    const amountOk = !Number.isNaN(amtNum) && amtNum > 0;
    const recipientOk =
        recipientMode === 'p2p_code' ? recipientP2p.trim().length > 0 : recipientLoginUid.trim().length > 0;
    const canContinue = amountOk && recipientOk;

    const glass = walletFlowGlass;
    const soft = walletFlowGlassSoft;
    const tabBtn = (active) =>
        [
            'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
            active
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md ring-1 ring-violet-400/40'
                : 'text-slate-500 hover:bg-white/[0.06] hover:text-white',
        ].join(' ');

    return (
        <WalletFlowShell overview={overview} loadError={err} bannerSuccess={msg} footerTag="Wallet · P2P">
            {overview ? (
                <section className={`relative mt-4 overflow-hidden p-4 sm:p-5 ${glass}`}>
                    <div className="pointer-events-none absolute -left-6 -bottom-8 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" aria-hidden />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        {qrPayload ? (
                            <div className={`flex shrink-0 justify-center self-center rounded-xl border border-white/10 bg-slate-950/50 p-2.5 sm:self-start ${soft}`}>
                                <QRCodeSVG value={qrPayload} size={128} level="M" includeMargin />
                            </div>
                        ) : null}
                        <div className="min-w-0 flex-1 space-y-2">
                            <div>
                                <p className={walletFlowLabel}>P2P balance</p>
                                <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-emerald-400 sm:text-3xl">{fmtUsd(overview.p2p_wallet_balance)}</p>
                                <p className="mt-0.5 text-[11px] text-slate-500">Min. send ${minP2p} USDT</p>
                            </div>
                            <div className="break-all rounded-xl border border-white/10 bg-black/30 px-2.5 py-2 font-mono text-xs font-semibold text-white">{code || '—'}</div>
                            <div className="flex flex-wrap gap-1.5">
                                <button type="button" onClick={() => copyText(code)} className={`${walletFlowPrimaryBtn} !w-auto !px-4 !py-2 !text-xs`}>
                                    Copy code
                                </button>
                                <button type="button" onClick={() => copyText(qrPayload)} className={walletFlowSecondaryBtn}>
                                    Copy QR text
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            ) : null}

            {lastTransfer?.transaction ? (
                <section className={`relative mt-4 overflow-hidden border border-emerald-500/35 bg-emerald-950/25 p-3 text-xs ${soft}`} role="status">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <p className="font-medium text-emerald-100">{lastTransfer.message}</p>
                            <p className="mt-1 text-emerald-200/80">{fmtWhen(lastTransfer.transaction.created_at)}</p>
                        </div>
                        <button type="button" onClick={() => setLastTransfer(null)} className="shrink-0 font-semibold text-emerald-300 underline underline-offset-2">
                            Dismiss
                        </button>
                    </div>
                    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                        {[
                            ['Amount', fmtUsd(lastTransfer.transaction.amount_usd)],
                            ['To user', lastTransfer.transaction.recipient_login_uid ?? '—'],
                            ['Email', lastTransfer.transaction.recipient_email_masked ?? '—'],
                            ['Ledger', `${lastTransfer.transaction.out_transaction_id} / ${lastTransfer.transaction.in_transaction_id}`],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-2">
                                <dt className="text-slate-500">{k}</dt>
                                <dd className={`max-w-[65%] text-right font-medium break-all ${k === 'Ledger' ? 'font-mono text-[10px]' : 'text-xs'} text-white`}>
                                    {v}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>
            ) : null}

            <section className={`relative mt-4 overflow-hidden p-4 sm:p-5 ${glass}`}>
                <div className="pointer-events-none absolute -right-6 top-0 h-20 w-20 rounded-full bg-violet-500/15 blur-2xl" aria-hidden />
                <p className={walletFlowLabel}>Send</p>

                <div className="mt-3 space-y-3">
                    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-white/10 bg-slate-950/60 p-1" role="tablist" aria-label="Recipient type">
                        {[
                            { id: 'p2p_code', label: 'Code / QR' },
                            { id: 'login_uid', label: 'User ID' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={recipientMode === tab.id}
                                onClick={() => {
                                    setRecipientMode(tab.id);
                                    setP2pRecipientPreview(null);
                                    setP2pLookupErr(null);
                                }}
                                className={tabBtn(recipientMode === tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {recipientMode === 'p2p_code' ? (
                        <div className="space-y-2">
                            <span className={walletFlowLabel}>Recipient</span>
                            <input
                                type="text"
                                value={recipientP2p}
                                onChange={(e) => setRecipientP2p(e.target.value)}
                                placeholder="rms:p2p:…"
                                className={`${walletFlowInput} font-mono text-sm`}
                            />
                            <div className="flex flex-wrap items-center gap-1.5">
                                {!camOpen ? (
                                    <button type="button" onClick={startScan} className={`${walletFlowPrimaryBtn} !w-auto !px-4 !py-2 !text-xs`}>
                                        Scan QR
                                    </button>
                                ) : (
                                    <button type="button" onClick={stopScan} className={walletFlowGhostBtn}>
                                        Stop
                                    </button>
                                )}
                            </div>
                            {camOpen ? (
                                <div id="p2p-inline-qr-region" className="max-w-sm overflow-hidden rounded-xl border-2 border-dashed border-violet-500/40" />
                            ) : null}
                            {p2pRecipientPreview ? (
                                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs">
                                    <span className="text-slate-500">Recipient</span>
                                    <p className="mt-0.5 font-semibold text-white">{p2pRecipientPreview.name || p2pRecipientPreview.login_uid}</p>
                                    <p className="mt-0.5 font-mono text-[11px] text-emerald-300/90">User ID: {p2pRecipientPreview.login_uid}</p>
                                    {p2pRecipientPreview.email_masked ? <p className="mt-0.5 text-[11px] text-slate-500">{p2pRecipientPreview.email_masked}</p> : null}
                                </div>
                            ) : null}
                            {p2pLookupErr ? <p className="text-xs text-amber-400">{p2pLookupErr}</p> : null}
                        </div>
                    ) : null}

                    {recipientMode === 'login_uid' ? (
                        <div className="space-y-1">
                            <label className={walletFlowLabel}>User ID</label>
                            <input
                                type="text"
                                value={recipientLoginUid}
                                onChange={(e) => setRecipientLoginUid(e.target.value)}
                                placeholder="Login UID"
                                autoComplete="off"
                                className={`${walletFlowInput} font-mono text-sm`}
                            />
                        </div>
                    ) : null}

                    <div className="space-y-1">
                        <label className={walletFlowLabel}>Amount (USDT)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className={`${walletFlowInput} tabular-nums`}
                        />
                    </div>

                    <button type="button" onClick={openConfirm} disabled={!canContinue} className={`${walletFlowPrimaryBtn} disabled:cursor-not-allowed disabled:opacity-40`}>
                        Continue (password)
                    </button>
                </div>
            </section>

            {confirmOpen ? (
                <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="p2p-send-confirm-title">
                    <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close" onClick={closeConfirm} />
                    <div className={walletFlowModalSurface}>
                        <h2 id="p2p-send-confirm-title" className="text-base font-bold text-white">
                            Confirm send
                        </h2>
                        <p className="mt-1 text-xs text-slate-400">Password debits your P2P balance.</p>
                        <ul className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/25 p-3 text-xs">
                            <li className="flex justify-between gap-2">
                                <span className="text-slate-500">To</span>
                                <span className="max-w-[min(100%,11rem)] text-right break-all text-emerald-400">{recipientSummaryLabel()}</span>
                            </li>
                            <li className="flex justify-between gap-2 border-t border-white/10 pt-2 font-semibold">
                                <span className="text-white">Amount</span>
                                <span className="tabular-nums text-emerald-400">{amountOk ? fmtUsd(amtNum) : '—'}</span>
                            </li>
                        </ul>
                        <form onSubmit={submitConfirmed} className="mt-4 space-y-2">
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
                            {confirmErr ? <p className="text-xs text-red-400">{confirmErr}</p> : null}
                            <div className="flex flex-wrap gap-2 pt-1">
                                <button type="button" onClick={closeConfirm} className={walletFlowSecondaryBtn}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={busy} className={`${walletFlowPrimaryBtn} !w-auto px-6 disabled:opacity-50`}>
                                    {busy ? '…' : 'Send'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </WalletFlowShell>
    );
}

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

function IconWallet3d() {
    return (
        <svg viewBox="0 0 120 120" className="h-[4.75rem] w-[4.75rem] shrink-0 drop-shadow-[0_0_20px_rgba(139,92,246,0.4)]" aria-hidden>
            <defs>
                <linearGradient id="wf-shell-wtop" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <linearGradient id="wf-shell-wface" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#312e81" />
                    <stop offset="100%" stopColor="#1e1b4b" />
                </linearGradient>
            </defs>
            <ellipse cx="60" cy="88" rx="44" ry="10" fill="rgba(99,102,241,0.25)" />
            <path d="M24 48 L60 28 L96 48 L96 78 L60 98 L24 78 Z" fill="url(#wf-shell-wface)" stroke="rgba(167,139,250,0.5)" strokeWidth="1.2" />
            <path d="M24 48 L60 28 L96 48 L60 68 Z" fill="url(#wf-shell-wtop)" opacity="0.95" />
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

export const walletFlowGlass = 'rounded-2xl border border-white/[0.12] bg-gradient-to-br from-white/[0.08] to-white/[0.02] shadow-[0_6px_28px_rgba(0,0,0,0.4)] backdrop-blur-xl';

export const walletFlowGlassSoft = 'rounded-2xl border border-white/[0.1] bg-white/[0.04] backdrop-blur-md';

export const walletFlowInput =
    'w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-base text-white shadow-inner shadow-black/30 outline-none ring-0 transition placeholder:text-slate-600 focus:border-violet-500/50 focus:shadow-[0_0_0_2px_rgba(139,92,246,0.2)]';

export const walletFlowLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400';

export const walletFlowPrimaryBtn =
    'relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(109,40,217,0.35)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50';

export const walletFlowSecondaryBtn =
    'rounded-lg border border-violet-400/40 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/15';

export const walletFlowGhostBtn =
    'rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/25 hover:text-white';

export const walletFlowModalSurface =
    'relative z-10 w-full max-w-md rounded-2xl border border-white/[0.14] bg-[#0f172a] p-5 text-white shadow-xl backdrop-blur-xl';

/**
 * Same chrome as MemberWalletDepositPage: gradient backdrop, balance hero, horizontal quick nav, feature strip.
 */
export default function WalletFlowShell({
    overview,
    loadError,
    bannerSuccess,
    bannerError,
    children,
    footerTag = 'Wallet',
}) {
    const { t } = useTranslation();
    const [hideBalance, setHideBalance] = useState(false);

    const balance = overview?.wallet_balance ?? null;
    const p2pBalance = overview?.p2p_wallet_balance ?? null;

    const totalUsd = useMemo(() => {
        if (balance === null || p2pBalance === null) return null;
        const a = Number.parseFloat(balance) || 0;
        const b = Number.parseFloat(p2pBalance) || 0;
        return (a + b).toFixed(2);
    }, [balance, p2pBalance]);

    const glass = walletFlowGlass;
    const glassSoft = walletFlowGlassSoft;

    return (
        <div className="relative mx-auto max-w-md px-1 pb-5 font-[Inter,system-ui,sans-serif] sm:px-0">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(ellipse_at_50%_0%,rgba(124,58,237,0.32),transparent_70%)]" aria-hidden />

            {bannerSuccess ? <p className="mb-2 text-center text-xs font-medium text-emerald-400">{bannerSuccess}</p> : null}
            {(bannerError || loadError) ? (
                <p className="mb-2 text-center text-xs text-red-400">{bannerError ?? loadError}</p>
            ) : null}

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

            {children}

            <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
                <div className={`p-2 text-center sm:p-2.5 ${glassSoft}`}>
                    <IconShield />
                    <p className="mt-1 text-[10px] font-bold text-white">Secure</p>
                    <p className="text-[9px] leading-snug text-slate-500">Ledger-protected</p>
                </div>
                <div className={`p-2 text-center sm:p-2.5 ${glassSoft}`}>
                    <IconBolt />
                    <p className="mt-1 text-[10px] font-bold text-white">Fast</p>
                    <p className="text-[9px] leading-snug text-slate-500">Quick settlement</p>
                </div>
                <div className={`p-2 text-center sm:p-2.5 ${glassSoft}`}>
                    <IconGlobe />
                    <p className="mt-1 text-[10px] font-bold text-white">Flexible</p>
                    <p className="text-[9px] leading-snug text-slate-500">Multi-wallet</p>
                </div>
            </div>

            <p className="mt-5 text-center text-[9px] text-slate-600">{footerTag}</p>
        </div>
    );
}

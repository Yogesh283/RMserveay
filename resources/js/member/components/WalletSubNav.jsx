import { NavLink } from 'react-router-dom';

function tabClass(isActive, dark, extra = '') {
    const base =
        'flex min-h-[44px] w-full items-center justify-center rounded-xl px-2 py-2.5 text-center text-xs font-semibold leading-snug transition duration-200 active:scale-[0.98] sm:min-h-[46px] sm:px-3 sm:text-sm';
    if (isActive) {
        return `${base} ${extra} bg-gradient-to-r from-[#6C4CF1]/55 to-[#8E6BFF]/40 text-white shadow-[0_0_24px_rgba(108,76,241,0.35)] ring-1 ring-[#8E6BFF]/40`;
    }
    return dark
        ? `${base} ${extra} text-[#A0AEC0] hover:bg-white/[0.08] hover:text-white`
        : `${base} ${extra} text-gray-600 hover:bg-gray-100 hover:text-gray-900`;
}

export default function WalletSubNav({ dark }) {
    const wrap = dark ? 'border-white/10 bg-[#0B0F1A]/90 shadow-inner shadow-black/20' : 'border-gray-200 bg-gray-50/90 shadow-sm';

    return (
        <nav className="mb-8" aria-label="Wallet sections">
            <div className={`rounded-2xl border p-1.5 sm:p-2 ${wrap}`}>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-5">
            <NavLink to="/member/wallet" end className={({ isActive }) => tabClass(isActive, dark)}>
                Wallet home
            </NavLink>
            <NavLink to="/member/wallet/internal" className={({ isActive }) => tabClass(isActive, dark)}>
                Main ↔ P2P
            </NavLink>
            <NavLink to="/member/wallet/p2p" className={({ isActive }) => tabClass(isActive, dark)}>
                P2P send & QR
            </NavLink>
            <NavLink to="/member/wallet/deposit" className={({ isActive }) => tabClass(isActive, dark)}>
                Deposit
            </NavLink>
            <NavLink to="/member/wallet/withdraw" className={({ isActive }) => tabClass(isActive, dark, 'col-span-2 sm:col-span-1 lg:col-span-1')}>
                Withdraw
            </NavLink>
                </div>
            </div>
        </nav>
    );
}

import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

const menuItems = [
    { to: '/survey/wallet', title: 'Transactions', sub: 'Wallet and earning history', icon: '↺', glow: 'purple' },
    { to: '/survey/support', title: 'Support tickets', sub: 'Help and issue tracking', icon: '✦', glow: 'blue' },
    { to: '/survey/team', title: 'Active panels', sub: 'Activation progress panel', icon: '◎', glow: 'cyan' },
    { to: '/survey/dashboard', title: 'Sub panels', sub: 'Sub panel management', icon: '◈', glow: 'purple' },
    { to: '/survey/surveys', title: 'Super sub', sub: 'Super hierarchy overview', icon: '⬡', glow: 'orange' },
    { to: '/survey/account', title: 'Profile', sub: 'Profile and account details', icon: '◉', glow: 'pink' },
    { to: '/survey/panel-matching', title: 'Panel matching', sub: 'Panel matching insights', icon: '◌', glow: 'green' },
    { to: '/survey/sub-panel-matching', title: 'Sub-panel matching', sub: 'Sub matching network', icon: '⌁', glow: 'cyan' },
    { to: '/survey/super-sub-panel', title: 'Super sub-panel', sub: 'Super matching analytics', icon: '⬢', glow: 'orange' },
];

const glowStyles = {
    purple: {
        ring: 'ring-[rgba(167,139,250,0.35)]',
        border: 'border-[rgba(167,139,250,0.35)]',
        icon: 'from-[#7C3AED]/35 to-[#A855F7]/12 text-[#D8B4FE]',
        arrow: 'from-[#7C3AED] to-[#8B5CF6]',
        halo: 'shadow-[0_0_24px_rgba(124,58,237,0.32)]',
    },
    blue: {
        ring: 'ring-[rgba(96,165,250,0.35)]',
        border: 'border-[rgba(96,165,250,0.35)]',
        icon: 'from-[#2563EB]/35 to-[#3B82F6]/12 text-[#BFDBFE]',
        arrow: 'from-[#2563EB] to-[#38BDF8]',
        halo: 'shadow-[0_0_24px_rgba(37,99,235,0.3)]',
    },
    cyan: {
        ring: 'ring-[rgba(34,211,238,0.35)]',
        border: 'border-[rgba(34,211,238,0.35)]',
        icon: 'from-[#06B6D4]/35 to-[#22D3EE]/12 text-[#A5F3FC]',
        arrow: 'from-[#06B6D4] to-[#0EA5E9]',
        halo: 'shadow-[0_0_24px_rgba(6,182,212,0.3)]',
    },
    orange: {
        ring: 'ring-[rgba(251,146,60,0.35)]',
        border: 'border-[rgba(251,146,60,0.35)]',
        icon: 'from-[#EA580C]/35 to-[#FB923C]/12 text-[#FED7AA]',
        arrow: 'from-[#F97316] to-[#FB923C]',
        halo: 'shadow-[0_0_24px_rgba(249,115,22,0.3)]',
    },
    pink: {
        ring: 'ring-[rgba(244,114,182,0.35)]',
        border: 'border-[rgba(244,114,182,0.35)]',
        icon: 'from-[#DB2777]/35 to-[#F472B6]/12 text-[#FBCFE8]',
        arrow: 'from-[#DB2777] to-[#F472B6]',
        halo: 'shadow-[0_0_24px_rgba(219,39,119,0.3)]',
    },
    green: {
        ring: 'ring-[rgba(74,222,128,0.35)]',
        border: 'border-[rgba(74,222,128,0.35)]',
        icon: 'from-[#059669]/35 to-[#22C55E]/12 text-[#BBF7D0]',
        arrow: 'from-[#059669] to-[#22C55E]',
        halo: 'shadow-[0_0_24px_rgba(34,197,94,0.3)]',
    },
};

export default function MoreScreen() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#050816] via-[#070D1C] to-[#0B1120] px-3 pb-9 pt-8">
            <div className="pointer-events-none absolute -right-20 -top-12 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(147,51,234,0.35),rgba(6,182,212,0.08)_48%,transparent_72%)] blur-2xl" />
            <div className="pointer-events-none absolute -left-16 top-1/3 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.28),transparent_72%)] blur-[56px]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(168,85,247,0.12),transparent_16%),radial-gradient(circle_at_74%_30%,rgba(56,189,248,0.12),transparent_18%),radial-gradient(circle_at_45%_72%,rgba(251,146,60,0.1),transparent_22%)]" />

            <div className="relative mx-auto max-w-md rounded-[28px] border border-[#A855F7]/35 bg-[linear-gradient(160deg,rgba(17,24,39,0.86)_0%,rgba(8,13,29,0.72)_100%)] px-4 pb-6 pt-5 shadow-[0_0_0_1px_rgba(168,85,247,0.16),0_28px_64px_rgba(2,6,23,0.9),0_0_54px_rgba(124,58,237,0.3)] backdrop-blur-2xl">
                <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[linear-gradient(140deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_38%,rgba(56,189,248,0.05)_100%)]" />
                <div className="pointer-events-none absolute left-1/2 top-2 h-1 w-20 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#A855F7] via-[#8B5CF6] to-[#A855F7] shadow-[0_0_18px_rgba(168,85,247,0.9)]" />

                <header className="relative z-10 mb-5 pt-7 text-center">
                    <h1 className="text-[30px] font-extrabold tracking-tight text-white">More Options</h1>
                    <p className="mt-1 text-sm font-medium text-slate-400">Manage your account &amp; earnings</p>
                </header>

                <div className="relative z-10 grid grid-cols-2 gap-3">
                    {menuItems.map((item) => {
                        const theme = glowStyles[item.glow] ?? glowStyles.purple;
                        return (
                            <Link key={item.title} to={item.to} className="group">
                                <Card
                                    padding={false}
                                    className={[
                                        'h-full rounded-[24px] border bg-[linear-gradient(160deg,rgba(17,24,39,0.8)_0%,rgba(15,23,42,0.5)_100%)] p-3',
                                        'ring-1 transition duration-300',
                                        theme.border,
                                        theme.ring,
                                        'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(2,6,23,0.6)]',
                                        'hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_28px_rgba(139,92,246,0.26)]',
                                    ].join(' ')}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <span
                                            className={[
                                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-base font-bold',
                                                theme.icon,
                                                theme.halo,
                                            ].join(' ')}
                                        >
                                            {item.icon}
                                        </span>
                                        <span
                                            className={[
                                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r text-white',
                                                theme.arrow,
                                                theme.halo,
                                            ].join(' ')}
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm font-bold leading-tight text-white">{item.title}</p>
                                    <p className="mt-1 text-[11px] leading-snug text-slate-400">{item.sub}</p>
                                </Card>
                            </Link>
                        );
                    })}
                </div>

                <div className="relative z-10 mt-4">
                    <Card
                        variant="neon"
                        className="overflow-hidden rounded-[24px] border border-[#8B5CF6]/35 bg-[linear-gradient(130deg,rgba(91,33,182,0.3),rgba(30,58,138,0.24)_48%,rgba(10,15,33,0.8))] p-4"
                    >
                        <div className="flex gap-3">
                            <div className="relative flex w-[42%] shrink-0 items-center justify-center">
                                <div className="relative h-24 w-24 rounded-[22px] border border-[#A855F7]/45 bg-[linear-gradient(160deg,rgba(17,24,39,0.96),rgba(30,41,59,0.82))] shadow-[0_0_28px_rgba(168,85,247,0.3)]">
                                    <div className="absolute left-1/2 top-[18%] h-2.5 w-11 -translate-x-1/2 rounded-full bg-[#38BDF8]/80" />
                                    <div className="absolute left-1/2 top-[36%] h-9 w-14 -translate-x-1/2 rounded-[10px] border border-[#60A5FA]/35 bg-[#111827]/90" />
                                    <div className="absolute -right-2 top-2 h-6 w-6 rounded-full bg-[#F59E0B] shadow-[0_0_14px_rgba(245,158,11,0.8)]" />
                                    <div className="absolute -left-2 bottom-3 h-5 w-5 rounded-full bg-[#FBBF24] shadow-[0_0_14px_rgba(251,191,36,0.8)]" />
                                    <div className="absolute -right-3 bottom-2 text-lg text-[#A78BFA] drop-shadow-[0_0_12px_rgba(167,139,250,0.9)]">↗</div>
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-lg font-extrabold leading-tight text-white">Full Income Programme</p>
                                <p className="mt-1 text-xs text-slate-300">Unlock all earning opportunities</p>
                                <button
                                    type="button"
                                    className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] px-3 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.4),0_0_26px_rgba(37,99,235,0.45)] transition hover:brightness-110"
                                >
                                    Full income programme
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
                    <span className="absolute left-[12%] top-[19%] h-1.5 w-1.5 rounded-full bg-[#A78BFA] opacity-80 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
                    <span className="absolute left-[84%] top-[14%] h-1 w-1 rounded-full bg-[#22D3EE] opacity-90 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                    <span className="absolute left-[78%] top-[56%] h-1.5 w-1.5 rounded-full bg-[#FB923C] opacity-85 shadow-[0_0_10px_rgba(251,146,60,0.8)]" />
                    <span className="absolute left-[22%] top-[67%] h-1 w-1 rounded-full bg-[#4ADE80] opacity-80 shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
                </div>
            </div>
        </div>
    );
}

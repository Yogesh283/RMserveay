import { Link } from 'react-router-dom';
import { ButtonLink, Card, ScreenTitle } from '../components/ui';

const stats = [
    { label: 'Active surveys', value: '12', hint: 'live' },
    { label: 'Total responses', value: '3.2k', hint: '30d' },
    { label: 'Total spend', value: '₹48k', hint: 'campaigns' },
];

const recent = [
    { id: '1', title: 'Premium tech attitudes', reward: '₹85', progress: 78 },
    { id: '2', title: 'Snack preferences 2025', reward: '₹40', progress: 42 },
    { id: '3', title: 'EV charging habits', reward: '₹120', progress: 91 },
];

const quick = [
    { to: '/survey/create/basic', label: 'Create survey', icon: MPlus },
    { to: '/survey/surveys', label: 'My surveys', icon: MList },
    { to: '/survey/reports', label: 'Reports', icon: MChart },
    { to: '/survey/team', label: 'Team', icon: MUsers },
];

function MPlus() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    );
}
function MList() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
    );
}
function MChart() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
        </svg>
    );
}
function MUsers() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.646-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
    );
}

function CoinStack() {
    return (
        <svg className="h-20 w-20 shrink-0" viewBox="0 0 80 80" fill="none" aria-hidden>
            <defs>
                <linearGradient id="dc" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FCD34D" />
                    <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
            </defs>
            <ellipse cx="40" cy="68" rx="26" ry="6" fill="rgba(245,158,11,0.25)" />
            <circle cx="40" cy="36" r="22" fill="url(#dc)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
            <text x="40" y="42" textAnchor="middle" fill="#0F172A" fontSize="16" fontWeight="bold" fontFamily="system-ui">
                ₹
            </text>
        </svg>
    );
}

export default function DashboardScreen() {
    return (
        <div className="relative min-h-screen px-4 pb-10 pt-12">
            <ScreenTitle eyebrow="RM Survey" title="Home" subtitle="Earn with premium surveys — instant visibility." />

            {/* Profile */}
            <div className="mb-6 flex items-center gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#7C3AED]/40 to-[#3B82F6]/30 ring-2 ring-amber-500/30 shadow-[0_8px_32px_rgba(124,58,237,0.35)]">
                    <span className="text-lg font-bold text-white">YK</span>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0B0F1A] bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Welcome back</p>
                    <p className="truncate text-lg font-semibold text-white">Yogesh Kumar</p>
                    <p className="text-xs text-slate-400">Elite · Verified wallet</p>
                </div>
                <Link
                    to="/survey/more"
                    className="shrink-0 rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-medium text-slate-200 hover:border-[#7C3AED]/40 hover:text-white"
                >
                    Menu
                </Link>
            </div>

            {/* Wallet */}
            <Card variant="gold" className="relative mb-6 overflow-hidden p-5">
                <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-40 bg-[#7C3AED]/15 blur-3xl" />
                <div className="relative flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-200/90">Wallet balance</p>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            ₹<span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">24,560</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-400">Withdrawable · T+1 settlement</p>
                    </div>
                    <CoinStack />
                </div>
                <div className="relative mt-5 flex gap-2">
                    <ButtonLink to="/survey/wallet/add" variant="gold" size="sm" className="!w-auto flex-1">
                        Add funds
                    </ButtonLink>
                    <ButtonLink to="/survey/wallet" variant="goldOutline" size="sm" className="!w-auto flex-1">
                        Details
                    </ButtonLink>
                </div>
            </Card>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-3 gap-2">
                {stats.map((s) => (
                    <Card key={s.label} variant="inset" className="p-3 text-center">
                        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
                        <p className="mt-1.5 text-base font-bold text-white">{s.value}</p>
                        <p className="mt-0.5 text-[9px] text-slate-600">{s.hint}</p>
                    </Card>
                ))}
            </div>

            {/* Live earnings */}
            <Card variant="neon" className="mb-6 p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300/90">Live earnings</p>
                        <p className="mt-1 text-2xl font-bold text-white">+18.4%</p>
                        <p className="text-xs text-slate-400">vs last week</p>
                    </div>
                    <div className="flex h-14 w-24 items-end justify-between gap-0.5 rounded-lg bg-[rgba(11,15,26,0.6)] px-2 py-2">
                        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                            <div key={i} className="w-1.5 rounded-t-sm bg-gradient-to-t from-[#7C3AED] to-[#3B82F6]" style={{ height: `${h}%` }} />
                        ))}
                    </div>
                </div>
            </Card>

            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Quick actions</p>
            <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {quick.map(({ to, label, icon: Icon }) => (
                    <Link
                        key={to}
                        to={to}
                        className="flex flex-col items-center gap-2 rounded-[18px] border border-white/[0.08] bg-[rgba(15,23,42,0.45)] p-3 text-center transition hover:border-[#7C3AED]/40 hover:shadow-[0_0_24px_rgba(124,58,237,0.25)]"
                    >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED]/30 to-[#3B82F6]/20 text-amber-200 ring-1 ring-white/10">
                            <Icon />
                        </span>
                        <span className="text-[10px] font-medium leading-tight text-slate-300">{label}</span>
                    </Link>
                ))}
            </div>

            {/* Trust */}
            <div className="mb-8 flex flex-wrap justify-center gap-2">
                {['Secure', 'Fast withdrawal', 'Global users'].map((t) => (
                    <span
                        key={t}
                        className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300/95"
                    >
                        {t}
                    </span>
                ))}
            </div>

            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Recent surveys</p>
                <Link to="/survey/surveys" className="text-xs font-medium text-blue-400 hover:text-blue-300">
                    View all
                </Link>
            </div>
            <div className="mt-3 space-y-2">
                {recent.map((r) => (
                    <Link key={r.id} to={`/survey/surveys/${r.id}`}>
                        <Card variant="elevated" className="p-4 transition hover:border-amber-500/20">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-white">{r.title}</p>
                                    <p className="mt-1 text-xs text-slate-500">Marketplace · matched</p>
                                </div>
                                <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">{r.reward}</span>
                            </div>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-[#7C3AED] to-blue-500 shadow-[0_0_12px_rgba(245,158,11,0.35)]"
                                    style={{ width: `${r.progress}%` }}
                                />
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}

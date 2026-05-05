import { Button, Card, ScreenTitle } from '../components/ui';

const members = [
    { name: 'Ananya R.', tier: 'Gold', active: true, earn: '₹420' },
    { name: 'Rohit M.', tier: 'Silver', active: true, earn: '₹180' },
    { name: 'Neha K.', tier: 'Bronze', active: false, earn: '₹95' },
];

export default function TeamScreen() {
    return (
        <div className="relative min-h-screen px-4 pb-10 pt-12">
            <ScreenTitle eyebrow="Network" title="Team & MLM" subtitle="Grow your circle · stacked commissions." />

            <div className="mb-5 grid grid-cols-3 gap-2">
                {[
                    { label: 'Members', value: '24' },
                    { label: 'Active', value: '18' },
                    { label: 'Team earn', value: '₹3.2k' },
                ].map((s) => (
                    <Card key={s.label} variant="inset" className="p-3 text-center">
                        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
                        <p className="mt-1.5 text-lg font-bold text-white">{s.value}</p>
                    </Card>
                ))}
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2">
                <Card variant="neon" className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">This month</p>
                    <p className="mt-1 text-2xl font-bold text-white">₹1,840</p>
                </Card>
                <Card variant="neon" className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">All time</p>
                    <p className="mt-1 text-2xl font-bold text-white">₹8,940</p>
                </Card>
            </div>

            <Card variant="elevated" className="mb-6 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">Your referral code</p>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-[16px] border border-[#7C3AED]/35 bg-[rgba(11,15,26,0.85)] px-4 py-4 ring-1 ring-[#3B82F6]/20">
                    <span className="font-mono text-base font-bold tracking-[0.18em] text-amber-200 sm:text-lg">RM-YK-9F2A</span>
                    <button
                        type="button"
                        className="shrink-0 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/20"
                    >
                        Copy
                    </button>
                </div>
                <Button variant="neon" className="mt-5 w-full" size="md" type="button">
                    Invite via link
                </Button>
            </Card>

            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Team members</p>
            <div className="space-y-2">
                {members.map((m) => (
                    <Card key={m.name} variant="inset" className="flex items-center gap-3 p-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-sm font-bold text-white shadow-[0_0_16px_rgba(124,58,237,0.45)]">
                            {m.name[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white">{m.name}</p>
                            <p className="text-xs text-slate-500">{m.tier}</p>
                        </div>
                        <div className="text-right">
                            <span
                                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${m.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-600/30 text-slate-400'}`}
                            >
                                {m.active ? 'Active' : 'Idle'}
                            </span>
                            <p className="mt-1 text-xs font-bold text-amber-300">{m.earn}</p>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

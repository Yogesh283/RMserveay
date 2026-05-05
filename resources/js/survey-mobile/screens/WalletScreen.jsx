import { Link } from 'react-router-dom';
import { Button, ButtonLink, Card, ScreenTitle } from '../components/ui';

const tx = [
    { id: 1, label: 'Survey completed · Tech attitudes', amt: '+ ₹85', pos: true, date: 'Today' },
    { id: 2, label: 'Withdrawal · UPI', amt: '− ₹5,000', pos: false, date: 'Yesterday' },
    { id: 3, label: 'Bonus · Referral tier', amt: '+ ₹320', pos: true, date: 'Mon' },
    { id: 4, label: 'Survey completed · Snacks', amt: '+ ₹40', pos: true, date: 'Sun' },
];

export default function WalletScreen() {
    return (
        <div className="relative min-h-screen px-4 pb-10 pt-12">
            <ScreenTitle eyebrow="Treasury" title="Wallet" subtitle="Neon-secure ledger · instant payouts." />

            <Card variant="gold" className="relative mb-6 overflow-hidden p-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(245,158,11,0.2),transparent_50%)]" />
                <p className="relative text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/90">Available balance</p>
                <p className="relative mt-2 text-5xl font-bold tracking-tight text-white">
                    ₹<span className="bg-gradient-to-r from-amber-100 to-amber-400 bg-clip-text text-transparent">24,560</span>
                </p>
                <div className="relative mt-6">
                    <Button variant="gold" size="md" className="w-full" type="button">
                        Withdraw
                    </Button>
                </div>
            </Card>

            <div className="mb-6 grid grid-cols-2 gap-2">
                <Card variant="inset" className="p-4">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Total earnings</p>
                    <p className="mt-1 text-xl font-bold text-emerald-400">₹1,24,900</p>
                </Card>
                <Card variant="inset" className="p-4">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">This month</p>
                    <p className="mt-1 text-xl font-bold text-amber-300">+ ₹4,280</p>
                </Card>
            </div>

            <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Transactions</p>
                <button type="button" className="text-xs font-medium text-blue-400 hover:text-blue-300">
                    Export
                </button>
            </div>
            <div className="space-y-2">
                {tx.map((t) => (
                    <Card key={t.id} variant="inset" className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-200">{t.label}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{t.date}</p>
                        </div>
                        <span className={`shrink-0 text-sm font-bold ${t.pos ? 'text-emerald-400' : 'text-rose-400'}`}>{t.amt}</span>
                    </Card>
                ))}
            </div>

            <div className="mt-6">
                <ButtonLink to="/survey/wallet/add" variant="neon" size="md">
                    Add funds
                </ButtonLink>
            </div>

            <p className="mt-8 text-center text-[11px] leading-relaxed text-slate-500">
                Segregated accounts · PCI-grade flows.{' '}
                <Link to="/survey/more" className="text-violet-400 underline-offset-2 hover:underline">
                    Learn more
                </Link>
            </p>
        </div>
    );
}

import { useState } from 'react';
import { Button, GlassCard } from '../components/ui';

const quick = ['₹500', '₹1,000', '₹2,500', '₹5,000'];

const methods = [
    { id: 'upi', label: 'UPI', icon: '◎' },
    { id: 'card', label: 'Card', icon: '▭' },
    { id: 'net', label: 'Net banking', icon: '⌂' },
    { id: 'wallet', label: 'Wallet', icon: '◈' },
];

export default function AddFundsScreen() {
    const [amt, setAmt] = useState('');
    const [method, setMethod] = useState('upi');

    return (
        <div className="min-h-screen px-4 pb-8 pt-14">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-white">Add funds</h1>
                <p className="mt-1 text-sm text-slate-400">Secure top-up</p>
            </header>

            <GlassCard className="p-5">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Amount</label>
                <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-500">₹</span>
                    <input
                        type="number"
                        value={amt}
                        onChange={(e) => setAmt(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-[18px] border border-white/10 bg-white/[0.06] py-4 pl-10 pr-4 text-3xl font-bold tracking-tight text-white placeholder:text-slate-700 focus:border-[#7C3AED]/50 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/35"
                    />
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                    {quick.map((q) => (
                        <button
                            key={q}
                            type="button"
                            onClick={() => setAmt(q.replace(/[^\d]/g, ''))}
                            className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-[#7C3AED]/45 hover:text-white"
                        >
                            {q}
                        </button>
                    ))}
                </div>
            </GlassCard>

            <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wide text-slate-500">Payment method</p>
            <div className="grid grid-cols-2 gap-3">
                {methods.map((m) => (
                    <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.id)}
                        className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition ${
                            method === m.id
                                ? 'border-[#7C3AED]/45 bg-gradient-to-br from-[#7C3AED]/22 to-[#3B82F6]/18 shadow-[0_0_28px_rgba(124,58,237,0.28)] ring-1 ring-amber-400/15'
                                : 'border-white/10 bg-white/[0.04] hover:border-white/20'
                        }`}
                    >
                        <span className="text-2xl opacity-80">{m.icon}</span>
                        <span className="text-xs font-semibold text-white">{m.label}</span>
                    </button>
                ))}
            </div>

            <GlassCard className="mt-8 flex items-center justify-between p-4">
                <div>
                    <p className="text-xs text-slate-500">Current balance</p>
                    <p className="text-lg font-bold text-white">₹2,45,600</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-400">Verified</span>
            </GlassCard>

            <div className="mt-10">
                <Button variant="gold" size="lg" className="w-full">
                    Proceed to pay
                </Button>
            </div>
        </div>
    );
}

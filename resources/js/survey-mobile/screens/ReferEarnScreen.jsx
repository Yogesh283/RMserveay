import { Button } from '../components/ui';
import { GiftBoxIllustration } from '../components/Illustrations';

const steps = ['Invite friend', 'Friend joins', 'You earn'];

export default function ReferEarnScreen() {
    return (
        <div className="relative min-h-screen px-4 pb-10 pt-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-transparent bg-gradient-to-r from-violet-400 to-amber-400 bg-clip-text">
                RM Survey
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white">Refer &amp; earn</h1>
            <p className="mt-1 text-sm text-slate-400">Web3-style rewards · stacked commissions</p>

            <div className="mt-8 flex justify-center">
                <div className="rounded-[24px] bg-gradient-to-b from-[rgba(124,58,237,0.2)] to-transparent p-6 ring-1 ring-amber-500/20">
                    <GiftBoxIllustration className="h-36 w-36" />
                </div>
            </div>

            <div className="mt-8 rounded-[20px] border border-amber-500/25 bg-[rgba(245,158,11,0.08)] p-5 text-center shadow-[0_0_40px_rgba(245,158,11,0.12)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-200/90">Your code</p>
                <p className="mt-3 font-mono text-2xl font-bold tracking-[0.2em] text-white">RM-YK-9F2A</p>
                <p className="mt-2 text-sm text-amber-200/80">
                    Earn <span className="font-bold text-amber-300">10%</span> on referral volume
                </p>
            </div>

            <Button variant="gold" size="lg" className="mt-6 w-full" type="button">
                Share invite link
            </Button>

            <div className="mt-10 space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">How it works</p>
                {steps.map((label, i) => (
                    <div key={label} className="flex items-center gap-4 rounded-[18px] border border-white/[0.08] bg-[rgba(15,23,42,0.5)] p-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-sm font-bold text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]">
                            {i + 1}
                        </span>
                        <p className="font-medium text-white">{label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

import { Link } from 'react-router-dom';
import { GlassCard, GradientButtonLink } from '../components/ui';
import StepProgress from '../components/StepProgress';

export default function BudgetScreen() {
    return (
        <div className="min-h-screen px-4 pb-8 pt-12">
            <Link to="/survey/audience" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </Link>

            <h1 className="text-2xl font-bold text-white">Budget &amp; rewards</h1>
            <p className="mt-1 text-sm text-slate-400">Set incentive per response</p>

            <GlassCard className="mt-6 p-5">
                <StepProgress current={4} total={5} />
            </GlassCard>

            <div className="mt-8 space-y-6">
                <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Reward per response</label>
                    <div className="mt-2 flex gap-2">
                        {['₹5', '₹10', '₹25', '₹50'].map((amt, i) => (
                            <button
                                key={amt}
                                type="button"
                                className={`flex-1 rounded-2xl py-3 text-sm font-semibold ${
                                    i === 1
                                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-white shadow-[0_8px_28px_rgba(124,58,237,0.35)] ring-1 ring-amber-400/15'
                                        : 'border border-white/10 bg-white/5 text-slate-300'
                                }`}
                            >
                                {amt}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Total responses (target)</label>
                    <input
                        type="number"
                        defaultValue={500}
                        className="mt-2 w-full rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-white focus:border-[#7C3AED]/50 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/35"
                    />
                </div>

                <GlassCard glow className="space-y-4 p-5">
                    <div className="flex justify-between border-b border-white/10 pb-3">
                        <span className="text-sm text-slate-400">Est. budget</span>
                        <span className="text-lg font-bold text-white">₹5,000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Platform fee (12%)</span>
                        <span className="text-slate-300">₹600</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-3">
                        <span className="font-semibold text-white">Total payable</span>
                        <span className="bg-gradient-to-r from-violet-200 to-indigo-300 bg-clip-text text-xl font-bold text-transparent">
                            ₹5,600
                        </span>
                    </div>
                </GlassCard>

                <GlassCard className="flex items-center justify-between p-4">
                    <div>
                        <p className="text-xs text-slate-500">Wallet balance</p>
                        <p className="text-xl font-bold text-white">₹2,45,600</p>
                    </div>
                    <Link to="/survey/wallet/add" className="text-xs font-semibold text-[#60A5FA] hover:text-[#93C5FD]">
                        Top up →
                    </Link>
                </GlassCard>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Campaign duration</p>
                    <p className="mt-2 text-sm text-slate-300">
                        Survey runs up to <span className="font-semibold text-white">14 days</span> or until responses fill — whichever comes first.
                    </p>
                </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3">
                <GradientButtonLink to="/survey/audience" variant="ghost">
                    Previous
                </GradientButtonLink>
                <GradientButtonLink to="/survey/review">Next</GradientButtonLink>
            </div>
        </div>
    );
}

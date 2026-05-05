import { Link } from 'react-router-dom';
import { GlassCard, GradientButtonLink } from '../components/ui';
import StepProgress from '../components/StepProgress';

const categories = ['Product', 'Brand', 'Customer exp.', 'Market', 'Other'];
const types = [
    { id: 'pulse', title: 'Pulse', desc: 'Quick pulse check', icon: '⚡' },
    { id: 'deep', title: 'Deep dive', desc: 'Detailed feedback', icon: '🔍' },
    { id: 'nps', title: 'NPS style', desc: 'Recommend score', icon: '📈' },
];

export default function CreateBasicScreen() {
    return (
        <div className="min-h-screen px-4 pb-8 pt-12">
            <Link to="/survey/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </Link>

            <h1 className="text-2xl font-bold text-white">Create survey</h1>
            <p className="mt-1 text-sm text-slate-400">Basic information</p>

            <GlassCard className="mt-6 p-5">
                <StepProgress current={1} total={5} />
            </GlassCard>

            <div className="mt-8 space-y-5">
                <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Survey title</label>
                    <input
                        type="text"
                        placeholder="e.g. Product satisfaction — April"
                        className="mt-2 w-full rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:border-[#7C3AED]/50 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/35"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Description</label>
                    <textarea
                        rows={3}
                        placeholder="What do you want to learn?"
                        className="mt-2 w-full resize-none rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:border-[#7C3AED]/50 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/35"
                    />
                </div>

                <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Category</label>
                    <select className="mt-2 w-full appearance-none rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-white focus:border-[#7C3AED]/50 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/35">
                        <option value="">Select category</option>
                        {categories.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Survey type</p>
                    <div className="mt-3 grid gap-3">
                        {types.map((t, idx) => (
                            <button
                                key={t.id}
                                type="button"
                                className={`flex items-start gap-4 rounded-[18px] border p-4 text-left transition ${
                                    idx === 0
                                        ? 'border-[#7C3AED]/45 bg-gradient-to-r from-[#7C3AED]/18 to-[#3B82F6]/12 shadow-[0_0_28px_rgba(124,58,237,0.22)] ring-1 ring-amber-400/15'
                                        : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                                }`}
                            >
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#7C3AED]/40 to-[#3B82F6]/28 text-xl ring-1 ring-white/10">
                                    {t.icon}
                                </span>
                                <div>
                                    <p className="font-semibold text-white">{t.title}</p>
                                    <p className="mt-0.5 text-xs text-slate-400">{t.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-10">
                <GradientButtonLink to="/survey/create/questions">Next</GradientButtonLink>
            </div>
        </div>
    );
}

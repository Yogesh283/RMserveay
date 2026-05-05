import { Link } from 'react-router-dom';
import { GlassCard, GradientButtonLink } from '../components/ui';
import StepProgress from '../components/StepProgress';

export default function ReviewScreen() {
    return (
        <div className="min-h-screen px-4 pb-8 pt-12">
            <Link to="/survey/budget" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </Link>

            <h1 className="text-2xl font-bold text-white">Review &amp; publish</h1>
            <p className="mt-1 text-sm text-slate-400">Confirm before launch</p>

            <GlassCard className="mt-6 p-5">
                <StepProgress current={5} total={5} />
            </GlassCard>

            <GlassCard glow className="mt-8 space-y-5 p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-[#A78BFA]">Survey</p>
                        <h2 className="mt-1 text-lg font-bold text-white">Product satisfaction — April</h2>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                        Ready
                    </span>
                </div>
                <div className="space-y-3 border-t border-white/10 pt-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Type</span>
                        <span className="font-medium text-white">Pulse check</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Questions</span>
                        <span className="font-medium text-white">3</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Audience</span>
                        <span className="font-medium text-white">IN · 18–45 · EN</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Budget</span>
                        <span className="font-semibold text-[#FBBF24]">₹5,600 total</span>
                    </div>
                    <div className="flex justify-between rounded-xl bg-white/[0.04] px-3 py-2">
                        <span className="text-slate-400">Reward / response</span>
                        <span className="font-bold text-white">₹10</span>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="mt-4 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Respondents will see a mobile-first flow with rating, multiple choice, and short text — optimized for completion.
                </p>
            </GlassCard>

            <div className="mt-10 space-y-3">
                <GradientButtonLink to="/survey/dashboard" variant="green" className="!py-4 text-base">
                    Launch survey
                </GradientButtonLink>
                <GradientButtonLink to="/survey/budget" variant="ghost">
                    Edit budget
                </GradientButtonLink>
            </div>
        </div>
    );
}

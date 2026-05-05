import { Link } from 'react-router-dom';
import { GlassCard, GradientButtonLink } from '../components/ui';
import StepProgress from '../components/StepProgress';

const genders = ['All', 'Female', 'Male', 'Non-binary', 'Prefer not'];

export default function AudienceScreen() {
    return (
        <div className="min-h-screen px-4 pb-8 pt-12">
            <Link to="/survey/create/questions" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </Link>

            <h1 className="text-2xl font-bold text-white">Audience</h1>
            <p className="mt-1 text-sm text-slate-400">Who should see this survey?</p>

            <GlassCard className="mt-6 p-5">
                <StepProgress current={3} total={5} />
            </GlassCard>

            <div className="mt-8 space-y-6">
                <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Location</label>
                    <select className="mt-2 w-full rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-white focus:border-[#7C3AED]/50 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/35">
                        <option>India — All regions</option>
                        <option>Metro cities</option>
                        <option>Tier 2 &amp; 3</option>
                        <option>Custom…</option>
                    </select>
                </div>

                <div>
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Age range</span>
                        <span className="font-semibold text-[#FBBF24]">18 — 45</span>
                    </div>
                    <input type="range" min="18" max="65" defaultValue="45" className="mt-3 h-2 w-full appearance-none rounded-full bg-white/10 accent-[#7C3AED]" />
                    <div className="mt-1 flex justify-between text-[10px] text-slate-600">
                        <span>18</span>
                        <span>65+</span>
                    </div>
                </div>

                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Gender</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {genders.map((g, i) => (
                            <button
                                key={g}
                                type="button"
                                className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                                    i === 0
                                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] ring-1 ring-amber-400/20'
                                        : 'border border-white/15 bg-white/5 text-slate-300 hover:border-[#7C3AED]/40'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Language</label>
                    <select className="mt-2 w-full rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-white focus:border-[#7C3AED]/50 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/35">
                        <option>English</option>
                        <option>Hindi</option>
                        <option>Bilingual (EN + HI)</option>
                    </select>
                </div>

                <GlassCard className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Additional filters</p>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="text-[11px] text-slate-400">Education</label>
                            <select className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white">
                                <option>Any</option>
                                <option>Graduate+</option>
                                <option>Postgraduate</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-400">Income band</label>
                            <select className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white">
                                <option>Any</option>
                                <option>₹5–15 LPA</option>
                                <option>₹15–30 LPA</option>
                                <option>₹30 LPA+</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-400">Occupation</label>
                            <select className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white">
                                <option>Any</option>
                                <option>Student</option>
                                <option>Employed</option>
                                <option>Self-employed</option>
                                <option>Retired</option>
                            </select>
                        </div>
                    </div>
                </GlassCard>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3">
                <GradientButtonLink to="/survey/create/questions" variant="ghost">
                    Previous
                </GradientButtonLink>
                <GradientButtonLink to="/survey/budget">Next</GradientButtonLink>
            </div>
        </div>
    );
}

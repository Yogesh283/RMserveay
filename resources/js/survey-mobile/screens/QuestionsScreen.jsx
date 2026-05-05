import { Link } from 'react-router-dom';
import { GlassCard, GradientButtonLink } from '../components/ui';
import StepProgress from '../components/StepProgress';

const questions = [
    {
        type: 'rating',
        label: 'Overall satisfaction',
        meta: '1–5 stars',
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.881a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
        ),
    },
    {
        type: 'choice',
        label: 'How did you hear about us?',
        meta: 'Multiple choice · 4 options',
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m9 3a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-9 3h.375m0 0H8.25m9-9h.375m0 0H21" />
            </svg>
        ),
    },
    {
        type: 'text',
        label: 'What should we improve?',
        meta: 'Open text · short',
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
        ),
    },
];

export default function QuestionsScreen() {
    return (
        <div className="min-h-screen px-4 pb-8 pt-12">
            <Link to="/survey/create/basic" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </Link>

            <h1 className="text-2xl font-bold text-white">Questions</h1>
            <p className="mt-1 text-sm text-slate-400">Build your questionnaire</p>

            <GlassCard className="mt-6 p-5">
                <StepProgress current={2} total={5} />
            </GlassCard>

            <div className="mt-8 space-y-3">
                {questions.map((q, i) => (
                    <GlassCard key={i} className="flex gap-4 p-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#7C3AED]/35 to-[#3B82F6]/20 text-slate-100 ring-1 ring-white/10">
                            {q.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                            <span className="inline-block rounded-md bg-[rgba(124,58,237,0.2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#C4B5FD]">
                                {q.type}
                            </span>
                            <p className="mt-2 font-medium text-white">{q.label}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{q.meta}</p>
                        </div>
                        <button type="button" className="shrink-0 self-start text-slate-500 hover:text-white">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                            </svg>
                        </button>
                    </GlassCard>
                ))}
            </div>

            <button
                type="button"
                className="mt-6 w-full rounded-[18px] border border-dashed border-[#7C3AED]/45 bg-[rgba(124,58,237,0.12)] py-4 text-sm font-semibold text-[#C4B5FD] shadow-[0_0_24px_rgba(124,58,237,0.12)] transition hover:bg-[rgba(124,58,237,0.2)]"
            >
                + Add question
            </button>

            <div className="mt-10 grid grid-cols-2 gap-3">
                <GradientButtonLink to="/survey/create/basic" variant="ghost">
                    Previous
                </GradientButtonLink>
                <GradientButtonLink to="/survey/audience">Next</GradientButtonLink>
            </div>
        </div>
    );
}

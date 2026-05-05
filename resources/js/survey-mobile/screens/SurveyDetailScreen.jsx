import { Link, useParams } from 'react-router-dom';
import { ButtonLink, Card } from '../components/ui';
import { CartCoinsIllustration } from '../components/Illustrations';

const DETAIL = {
    '1': {
        title: 'Premium tech attitudes',
        reward: 85,
        minutes: 6,
        responses: '2.1k',
        progress: 22,
        desc: 'Help brands understand early-adopter sentiment toward AI hardware.',
    },
    '2': {
        title: 'Snack preferences 2025',
        reward: 40,
        minutes: 4,
        responses: '890',
        progress: 0,
        desc: 'Quick preference mapping for FMCG innovation pipelines.',
    },
    '3': {
        title: 'EV charging habits',
        reward: 120,
        minutes: 9,
        responses: '540',
        progress: 0,
        desc: 'Infrastructure & behaviour study — matched respondents only.',
    },
};

export default function SurveyDetailScreen() {
    const { surveyId } = useParams();
    const d = DETAIL[surveyId] ?? DETAIL['1'];

    return (
        <div className="relative min-h-screen px-4 pb-10 pt-10">
            <Link to="/survey/surveys" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                All surveys
            </Link>

            <div className="flex flex-col items-center">
                <div className="relative flex items-center justify-center rounded-[24px] bg-gradient-to-b from-[rgba(124,58,237,0.15)] to-[rgba(15,23,42,0.8)] p-6 shadow-[0_0_60px_rgba(124,58,237,0.25)] ring-1 ring-white/10">
                    <CartCoinsIllustration className="h-36 w-36" />
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <h1 className="text-center text-xl font-bold leading-snug text-white">{d.title}</h1>
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                        High yield
                    </span>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 rounded-[18px] border border-white/[0.08] bg-[rgba(11,15,26,0.6)] p-3">
                <div className="text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Reward</p>
                    <p className="mt-1 text-sm font-bold text-amber-300">₹{d.reward}</p>
                </div>
                <div className="border-x border-white/10 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Time</p>
                    <p className="mt-1 text-sm font-bold text-white">{d.minutes} min</p>
                </div>
                <div className="text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Responses</p>
                    <p className="mt-1 text-sm font-bold text-blue-300">{d.responses}</p>
                </div>
            </div>

            <Card variant="default" className="mt-5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">About</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{d.desc}</p>
            </Card>

            <Card variant="gold" className="mt-4 p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/90">Earnings highlight</p>
                <p className="mt-2 text-3xl font-bold text-white">
                    up to <span className="text-amber-300">₹{d.reward}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">On full completion · quality bonus eligible</p>
            </Card>

            <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs text-slate-500">
                    <span>Your progress</span>
                    <span>{d.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 via-[#7C3AED] to-blue-500 shadow-[0_0_14px_rgba(245,158,11,0.4)]"
                        style={{ width: `${d.progress}%` }}
                    />
                </div>
            </div>

            <div className="mt-8 space-y-3">
                <ButtonLink to="/survey/dashboard" variant="gold" size="lg">
                    Start survey
                </ButtonLink>
                <ButtonLink to="/survey/surveys" variant="ghost" size="md">
                    Save for later
                </ButtonLink>
            </div>
        </div>
    );
}

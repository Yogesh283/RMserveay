import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { prepareSanctum } from '../../lib/auth';
import { RmsButton, RmsCard, RmsInput, RmsScreenTitle } from '../components/rms';

function sortQuestions(questions) {
    if (!Array.isArray(questions)) return [];
    return [...questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export default function MemberSurveySessionPage() {
    const { surveyId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [submitError, setSubmitError] = useState(null);
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState([]);
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const startRef = useRef(Date.now());

    const load = useCallback(async () => {
        setLoadError(null);
        setLoading(true);
        try {
            await prepareSanctum();
            const { data } = await window.axios.get(`api/member/surveys/${surveyId}`);
            const s = data.survey;
            setTitle(s?.title ?? 'Survey');
            setQuestions(sortQuestions(s?.questions ?? []));
        } catch (e) {
            setLoadError(e.response?.data?.message ?? e.message ?? 'Could not load survey');
        } finally {
            setLoading(false);
        }
    }, [surveyId]);

    useEffect(() => {
        startRef.current = Date.now();
        load();
    }, [load]);

    const total = questions.length;
    const q = questions[step];
    const progress = useMemo(() => (total > 0 ? ((step + 1) / total) * 100 : 0), [step, total]);

    const canNext = useMemo(() => {
        if (!q) return false;
        const v = answers[q.key];
        if (q.type === 'text') return String(v ?? '').trim().length > 0;
        if (q.type === 'rating') return v != null && v !== '';
        if (q.type === 'yes_no') return v === true || v === false;
        return v != null && v !== '';
    }, [q, answers]);

    function setAnswer(val) {
        if (!q) return;
        setAnswers((a) => ({ ...a, [q.key]: val }));
    }

    async function finish() {
        if (!total) return;
        setSubmitError(null);
        setSubmitting(true);
        try {
            await prepareSanctum();
            const payload = {
                answers: questions.map((qq) => ({
                    questionKey: qq.key,
                    value: answers[qq.key] ?? null,
                })),
                completionTimeSec: Math.round((Date.now() - startRef.current) / 1000),
            };
            await window.axios.post(`api/member/surveys/${surveyId}/responses`, payload);
            navigate('/member/surveys', { replace: true });
        } catch (e) {
            setSubmitError(e.response?.data?.message ?? e.message ?? 'Submit failed');
        } finally {
            setSubmitting(false);
        }
    }

    function next() {
        if (step < total - 1) {
            setStep((s) => s + 1);
        } else {
            finish();
        }
    }

    if (loading) {
        return (
            <div className="relative mx-auto max-w-lg space-y-6 pb-8">
                <p className="text-sm text-[#A0AEC0]">Loading survey…</p>
            </div>
        );
    }

    if (loadError || total === 0) {
        const emptyQuestionsMsg =
            'This survey has no questions yet. The publisher needs to add questions in the survey editor before anyone can complete it. (Locally: open the publisher dashboard, edit this survey, and save at least one question.)';
        return (
            <div className="relative mx-auto max-w-lg space-y-6 pb-8">
                <Link to="/member/surveys" className="text-sm font-semibold text-[#8E6BFF]">
                    ← Back to surveys
                </Link>
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {loadError || emptyQuestionsMsg}
                </p>
            </div>
        );
    }

    const optLabel = (o) => (typeof o === 'string' ? o : o?.label ?? String(o));

    return (
        <div className="relative mx-auto max-w-lg space-y-6 pb-8">
            <div className="flex items-center justify-between gap-2">
                <Link to="/member/surveys" className="text-sm font-semibold text-[#A0AEC0] transition hover:text-white active:scale-[0.98]">
                    ← Back
                </Link>
                <span className="text-xs font-medium text-[#A0AEC0]">Survey #{surveyId}</span>
            </div>

            <RmsScreenTitle eyebrow="RM Survey" title={title} subtitle="Answer each question — your progress is saved when you finish." />

            <div>
                <div className="mb-2 flex justify-between text-xs font-medium text-[#A0AEC0]">
                    <span>
                        Question {step + 1} / {total}
                    </span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#111827] ring-1 ring-white/10">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#6C4CF1] to-[#8E6BFF] transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <RmsCard variant="elevated" className="!p-5">
                {q.description ? <p className="mb-2 text-xs text-[#A0AEC0]">{q.description}</p> : null}
                <p className="text-lg font-bold text-white">{q.label}</p>

                {(q.type === 'multiple_choice' || q.type === 'dropdown') && Array.isArray(q.options) ? (
                    <ul className="mt-4 space-y-2">
                        {q.options.map((opt) => {
                            const label = optLabel(opt);
                            const sel = answers[q.key] === label || answers[q.key] === opt;
                            return (
                                <li key={label}>
                                    <button
                                        type="button"
                                        onClick={() => setAnswer(typeof opt === 'string' ? opt : label)}
                                        className={`flex w-full items-center rounded-2xl border px-4 py-3 text-left text-sm font-medium transition active:scale-[0.99] ${
                                            sel
                                                ? 'border-[#8E6BFF]/50 bg-[#6C4CF1]/20 text-white ring-1 ring-[#8E6BFF]/30'
                                                : 'border-white/10 bg-[#0B0F1A]/60 text-[#A0AEC0] hover:border-white/20 hover:text-white'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : null}

                {q.type === 'rating' ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {Array.from({ length: (q.maxRating ?? 5) - (q.minRating ?? 1) + 1 }, (_, i) => i + (q.minRating ?? 1)).map((n) => {
                            const sel = answers[q.key] === n;
                            return (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setAnswer(n)}
                                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold transition active:scale-[0.95] ${
                                        sel
                                            ? 'bg-gradient-to-br from-[#6C4CF1] to-[#8E6BFF] text-white shadow-lg shadow-[#6C4CF1]/30'
                                            : 'border border-white/10 bg-[#111827] text-[#A0AEC0] hover:text-white'
                                    }`}
                                >
                                    {n}
                                </button>
                            );
                        })}
                    </div>
                ) : null}

                {q.type === 'yes_no' ? (
                    <div className="mt-4 flex gap-3">
                        {[
                            { v: true, lab: 'Yes' },
                            { v: false, lab: 'No' },
                        ].map(({ v, lab }) => {
                            const sel = answers[q.key] === v;
                            return (
                                <button
                                    key={lab}
                                    type="button"
                                    onClick={() => setAnswer(v)}
                                    className={`flex-1 rounded-2xl border py-3 text-sm font-semibold transition ${
                                        sel
                                            ? 'border-[#8E6BFF]/50 bg-[#6C4CF1]/25 text-white ring-1 ring-[#8E6BFF]/30'
                                            : 'border-white/10 bg-[#111827] text-[#A0AEC0] hover:text-white'
                                    }`}
                                >
                                    {lab}
                                </button>
                            );
                        })}
                    </div>
                ) : null}

                {q.type === 'text' ? (
                    <RmsInput className="mt-4" placeholder="Your answer…" value={answers[q.key] ?? ''} onChange={(e) => setAnswer(e.target.value)} />
                ) : null}
            </RmsCard>

            {submitError ? <p className="text-sm text-red-300">{submitError}</p> : null}

            <RmsButton variant="neon" className="w-full" disabled={!canNext || submitting} onClick={next}>
                {submitting ? 'Submitting…' : step < total - 1 ? 'Next' : 'Finish'}
            </RmsButton>
        </div>
    );
}

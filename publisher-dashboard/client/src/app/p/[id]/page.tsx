'use client';

import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { computeVisibleKeys } from '@/lib/survey-logic';
import type { Survey, SurveyQuestion } from '@/types';

export default function PublicSurveyPage() {
  const params = useParams();
  const id = String(params.id ?? '');
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [respondent, setRespondent] = useState({ age: '', gender: '', location: '' });

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await apiFetch<{ survey: Survey }>(`/api/surveys/public/${id}`, { auth: false });
        setSurvey(data.survey);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Failed to load survey');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const questions = useMemo(() => survey?.questions ?? [], [survey]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!survey) return;
    setError('');
    const payload = {
      answers: Object.entries(answers).map(([questionKey, value]) => ({ questionKey, value })),
      respondent: {
        age: respondent.age ? Number(respondent.age) : undefined,
        gender: respondent.gender || undefined,
        location: respondent.location || undefined,
      },
    };
    try {
      await apiFetch(`/api/surveys/${survey._id}/responses`, {
        method: 'POST',
        body: JSON.stringify(payload),
        auth: false,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Submit failed');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
        <p className="text-alert">{error}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--bg)]">
        <div className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-8 max-w-md text-center shadow-card">
          <h1 className="text-xl font-bold text-earnings">Thank you!</h1>
          <p className="mt-2 text-[var(--text-secondary)]">Your response was recorded.</p>
          <p className="mt-6 text-sm text-[var(--text-secondary)]">You can close this tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] py-10 px-4">
      <div className="max-w-lg mx-auto mb-6">
        <h1 className="text-sm font-medium text-[var(--text-secondary)]">RM Survey</h1>
      </div>
      <form onSubmit={onSubmit}>
        <SurveyFormBody
          title={survey!.title}
          description={survey!.description ?? ''}
          questions={questions}
          answers={answers}
          setAnswers={setAnswers}
        />
        <div className="max-w-xl mx-auto mt-8 rounded-card border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
          <p className="text-sm font-medium">About you (optional)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              placeholder="Age"
              value={respondent.age}
              onChange={(e) => setRespondent({ ...respondent, age: e.target.value })}
              className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
            />
            <input
              placeholder="Gender"
              value={respondent.gender}
              onChange={(e) => setRespondent({ ...respondent, gender: e.target.value })}
              className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
            />
            <input
              placeholder="Location"
              value={respondent.location}
              onChange={(e) => setRespondent({ ...respondent, location: e.target.value })}
              className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        {error ? <p className="text-center text-sm text-alert mt-4">{error}</p> : null}
        <div className="max-w-xl mx-auto mt-6 flex justify-end">
          <button type="submit" className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}

function SurveyFormBody({
  title,
  description,
  questions,
  answers,
  setAnswers,
}: {
  title: string;
  description: string;
  questions: SurveyQuestion[];
  answers: Record<string, unknown>;
  setAnswers: (a: Record<string, unknown>) => void;
}) {
  const sorted = useMemo(
    () => [...questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [questions],
  );
  const visible = useMemo(() => computeVisibleKeys(sorted, answers), [sorted, answers]);

  return (
    <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-6 shadow-card max-w-xl mx-auto">
      <h2 className="text-xl font-bold">{title || 'Survey'}</h2>
      {description ? <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p> : null}
      <div className="mt-6 space-y-5">
        {sorted.map((q) => {
          if (!visible.has(q.key)) return null;
          return (
            <div key={q.key} className="rounded-lg border border-[var(--border)] p-4 bg-[var(--surface)]">
              <label className="block text-sm font-medium">
                {q.label}
                {q.required ? <span className="text-alert"> *</span> : null}
              </label>
              {q.description ? <p className="text-xs text-[var(--text-secondary)] mt-1">{q.description}</p> : null}
              <div className="mt-2">
                <QuestionInput q={q} value={answers[q.key]} onChange={(v) => setAnswers({ ...answers, [q.key]: v })} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: SurveyQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (q.type) {
    case 'text':
      return (
        <textarea
          required={q.required}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm min-h-[80px]"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'rating': {
      const min = q.minRating ?? 1;
      const max = q.maxRating ?? 5;
      return (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`h-9 w-9 rounded-lg border text-sm font-medium transition-card ${
                value === n ? 'border-primary bg-primary text-white' : 'border-[var(--border)] hover:border-primary'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }
    case 'yes_no':
      return (
        <div className="flex gap-2">
          {['yes', 'no'].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`rounded-lg px-4 py-2 text-sm capitalize border transition-card ${
                value === opt ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-[var(--border)]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    case 'dropdown':
      return (
        <select
          required={q.required}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {(q.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {(q.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name={q.key}
                required={q.required}
                checked={value === o}
                onChange={() => onChange(o)}
                className="accent-primary"
              />
              {o}
            </label>
          ))}
        </div>
      );
    default:
      return null;
  }
}

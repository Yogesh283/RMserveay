import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch, ApiError } from '@/api/client';
import { computeVisibleKeys } from '@/lib/survey-logic';
import type { SurveyQuestion } from '@/types';

export default function PublicSurvey() {
  const { id } = useParams();
  const [survey, setSurvey] = useState<{ title: string; description?: string; questions: SurveyQuestion[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [respondent, setRespondent] = useState({ age: '', gender: '', location: '' });

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await apiFetch<{ survey: typeof survey }>(`/surveys/public/${id}`, { auth: false });
        setSurvey(data.survey as typeof survey);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Load failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const questions = survey?.questions ?? [];
  const sorted = useMemo(() => [...questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [questions]);
  const visible = useMemo(() => computeVisibleKeys(sorted, answers), [sorted, answers]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || !survey) return;
    setError('');
    try {
      await apiFetch(`/surveys/${id}/responses`, {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionKey, value]) => ({ questionKey, value })),
          respondent: {
            age: respondent.age ? Number(respondent.age) : undefined,
            gender: respondent.gender || undefined,
            location: respondent.location || undefined,
          },
        }),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Submit failed');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error && !survey) return <p className="p-8 text-alert">{error}</p>;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-8 max-w-md text-center shadow-card">
          <h1 className="text-xl font-bold text-earnings">Thank you!</h1>
          <p className="mt-2 text-[var(--text-secondary)]">Response recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 bg-[var(--bg)]">
      <div className="max-w-xl mx-auto rounded-[10px] border border-[var(--border)] bg-[var(--bg)] p-6 shadow-card">
        <h1 className="text-xl font-bold">{survey?.title}</h1>
        {survey?.description && <p className="text-sm text-[var(--text-secondary)] mt-2">{survey.description}</p>}
        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          {sorted.map((q) => {
            if (!visible.has(q.key)) return null;
            return (
              <div key={q.key} className="rounded-lg border border-[var(--border)] p-4 bg-[var(--surface)]">
                <label className="text-sm font-medium">
                  {q.label}
                  {q.required && <span className="text-alert"> *</span>}
                </label>
                <Field q={q} value={answers[q.key]} onChange={(v) => setAnswers({ ...answers, [q.key]: v })} />
              </div>
            );
          })}
          <div className="rounded-lg border border-[var(--border)] p-4 space-y-2">
            <p className="text-sm font-medium">About you (optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input placeholder="Age" value={respondent.age} onChange={(e) => setRespondent({ ...respondent, age: e.target.value })} className="rounded border px-2 py-1 text-sm" />
              <input placeholder="Gender" value={respondent.gender} onChange={(e) => setRespondent({ ...respondent, gender: e.target.value })} className="rounded border px-2 py-1 text-sm" />
              <input placeholder="Location" value={respondent.location} onChange={(e) => setRespondent({ ...respondent, location: e.target.value })} className="rounded border px-2 py-1 text-sm" />
            </div>
          </div>
          {error && <p className="text-sm text-alert">{error}</p>}
          <button type="submit" className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ q, value, onChange }: { q: SurveyQuestion; value: unknown; onChange: (v: unknown) => void }) {
  switch (q.type) {
    case 'text':
      return (
        <textarea
          required={q.required}
          className="mt-2 w-full rounded border px-3 py-2 text-sm min-h-[72px]"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'rating': {
      const min = q.minRating ?? 1;
      const max = q.maxRating ?? 5;
      return (
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
            <button key={n} type="button" onClick={() => onChange(n)} className={`h-9 w-9 rounded border text-sm ${value === n ? 'bg-primary text-white' : ''}`}>
              {n}
            </button>
          ))}
        </div>
      );
    }
    case 'yes_no':
      return (
        <div className="mt-2 flex gap-2">
          {(['yes', 'no'] as const).map((opt) => (
            <button key={opt} type="button" onClick={() => onChange(opt)} className={`rounded px-4 py-2 border capitalize ${value === opt ? 'border-primary bg-primary/10' : ''}`}>
              {opt}
            </button>
          ))}
        </div>
      );
    case 'dropdown':
      return (
        <select required={q.required} className="mt-2 w-full rounded border px-3 py-2 text-sm" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
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
        <div className="mt-2 space-y-2">
          {(q.options ?? []).map((o) => (
            <label key={o} className="flex gap-2 text-sm">
              <input type="radio" name={q.key} checked={value === o} onChange={() => onChange(o)} />
              {o}
            </label>
          ))}
        </div>
      );
    default:
      return null;
  }
}

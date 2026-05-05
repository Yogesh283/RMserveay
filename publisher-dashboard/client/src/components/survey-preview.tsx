'use client';

import { useMemo, useState } from 'react';
import type { SurveyQuestion } from '@/types';
import { computeVisibleKeys } from '@/lib/survey-logic';

export function SurveyPreview({
  title,
  description,
  questions,
}: {
  title: string;
  description: string;
  questions: SurveyQuestion[];
}) {
  const sorted = useMemo(
    () => [...questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [questions],
  );
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const visible = useMemo(() => computeVisibleKeys(sorted, answers), [sorted, answers]);

  return (
    <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-6 shadow-card max-w-xl mx-auto">
      <h2 className="text-xl font-bold">{title || 'Untitled survey'}</h2>
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
              <div className="mt-2">{renderInput(q, answers, setAnswers)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderInput(
  q: SurveyQuestion,
  answers: Record<string, unknown>,
  setAnswers: (u: Record<string, unknown>) => void,
) {
  const v = answers[q.key];
  const set = (val: unknown) => setAnswers({ ...answers, [q.key]: val });

  switch (q.type) {
    case 'text':
      return (
        <textarea
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm min-h-[80px]"
          value={String(v ?? '')}
          onChange={(e) => set(e.target.value)}
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
              onClick={() => set(n)}
              className={`h-9 w-9 rounded-lg border text-sm font-medium transition-card ${
                v === n ? 'border-primary bg-primary text-white' : 'border-[var(--border)] hover:border-primary'
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
              onClick={() => set(opt)}
              className={`rounded-lg px-4 py-2 text-sm capitalize border transition-card ${
                v === opt ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-[var(--border)]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    case 'multiple_choice':
    case 'dropdown':
      if (q.type === 'dropdown') {
        return (
          <select
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            value={String(v ?? '')}
            onChange={(e) => set(e.target.value)}
          >
            <option value="">Select…</option>
            {(q.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      }
      return (
        <div className="space-y-2">
          {(q.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name={q.key}
                checked={v === o}
                onChange={() => set(o)}
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

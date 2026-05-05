import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SurveyPreview } from '@/components/SurveyPreview';
import { apiFetch, ApiError } from '@/api/client';
import type { QuestionLogic, QuestionType, Survey, SurveyQuestion, TargetAudience } from '@/types';

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'text', label: 'Text' },
  { value: 'rating', label: 'Rating' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'dropdown', label: 'Dropdown' },
];

const OPS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'is_empty', label: 'Is empty' },
] as const;

function newKey() {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptyQuestion(type: QuestionType = 'text'): SurveyQuestion {
  const key = newKey();
  return {
    key,
    type,
    label: 'New question',
    description: '',
    required: false,
    options: type === 'multiple_choice' || type === 'dropdown' ? ['Option A', 'Option B'] : [],
    minRating: 1,
    maxRating: 5,
    order: 0,
  };
}

export function SurveyBuilder({ survey }: { survey?: Survey | null }) {
  const navigate = useNavigate();
  const formId = useId();
  const [title, setTitle] = useState(survey?.title ?? '');
  const [description, setDescription] = useState(survey?.description ?? '');
  const [questions, setQuestions] = useState<SurveyQuestion[]>(() => {
    if (survey?.questions?.length) {
      return survey.questions.map((q, i) => ({ ...q, order: q.order ?? i }));
    }
    return [emptyQuestion('multiple_choice')];
  });
  const [targetAudience, setTargetAudience] = useState<TargetAudience>(survey?.targetAudience ?? {});
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [aiAudience, setAiAudience] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setQuestions((items) => {
      const oldIndex = items.findIndex((q) => q.key === active.id);
      const newIndex = items.findIndex((q) => q.key === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      const next = arrayMove(items, oldIndex, newIndex).map((q, i) => ({ ...q, order: i }));
      return next;
    });
  };

  const otherKeys = useCallback((except: string) => questions.filter((q) => q.key !== except).map((q) => q.key), [questions]);

  const applyAi = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setError('');
    try {
      const data = await apiFetch<{
        title: string;
        description: string;
        questions: SurveyQuestion[];
        insights?: string[];
      }>('/ai/suggestions', {
        method: 'POST',
        body: JSON.stringify({ topic: aiTopic, audience: aiAudience || undefined }),
      });
      setTitle(data.title);
      setDescription(data.description);
      setQuestions(
        data.questions.map((q, i) => ({
          ...q,
          key: q.key || newKey(),
          order: i,
          options: q.options ?? (['multiple_choice', 'dropdown'].includes(q.type) ? ['A', 'B'] : []),
        })),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'AI suggestions failed');
    } finally {
      setAiLoading(false);
    }
  };

  const payload = () => ({
    title,
    description,
    questions: questions.map((q, i) => {
      const out: SurveyQuestion = { ...q, order: i };
      if (!out.logic?.whenQuestionKey) delete out.logic;
      return out;
    }),
    targetAudience,
  });

  const save = async (status: 'draft' | 'active') => {
    setSaving(true);
    setError('');
    try {
      const body = { ...payload(), status };
      const sid = survey?._id ?? survey?.id;
      if (sid) {
        await apiFetch(`/surveys/${sid}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/surveys', { method: 'POST', body: JSON.stringify(body) });
      }
      navigate('/surveys');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{survey ? 'Edit survey' : 'Create survey'}</h1>
          <p className="text-sm text-[var(--text-secondary)]">Drag blocks to reorder. Add conditional logic per question.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface)] transition-card"
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save('draft')}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface)] transition-card disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save('active')}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95 transition-card disabled:opacity-50"
          >
            Save & publish
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-alert/40 bg-alert/10 px-4 py-3 text-sm text-alert">{error}</div>
      ) : null}

      <div className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">AI suggestions (mock)</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-[var(--text-secondary)]">Topic</label>
            <input
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              placeholder="e.g. Mobile app onboarding"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-[var(--text-secondary)]">Audience (optional)</label>
            <input
              value={aiAudience}
              onChange={(e) => setAiAudience(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              placeholder="e.g. 18–35 urban"
            />
          </div>
          <button
            type="button"
            disabled={aiLoading}
            onClick={applyAi}
            className="rounded-lg bg-primary/90 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {aiLoading ? 'Generating…' : 'Apply suggestions'}
          </button>
        </div>
      </div>

      {preview ? (
        <SurveyPreview title={title} description={description} questions={questions} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Title</label>
              <input
                id={`${formId}-title`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className="text-sm font-semibold mb-3">Target audience</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Age min</label>
                <input
                  type="number"
                  value={targetAudience.ageMin ?? ''}
                  onChange={(e) =>
                    setTargetAudience({
                      ...targetAudience,
                      ageMin: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Age max</label>
                <input
                  type="number"
                  value={targetAudience.ageMax ?? ''}
                  onChange={(e) =>
                    setTargetAudience({
                      ...targetAudience,
                      ageMax: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-[var(--text-secondary)]">Locations (comma)</label>
                <input
                  value={(targetAudience.locations ?? []).join(', ')}
                  onChange={(e) =>
                    setTargetAudience({
                      ...targetAudience,
                      locations: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                  placeholder="Mumbai, Delhi"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Questions</h2>
            <button
              type="button"
              onClick={() => setQuestions((q) => [...q, emptyQuestion('text')])}
              className="text-sm font-medium text-primary hover:underline"
            >
              + Add question
            </button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={questions.map((q) => q.key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {questions.map((q) => (
                  <SortableQuestionCard
                    key={q.key}
                    q={q}
                    allKeys={otherKeys(q.key)}
                    onChange={(next) =>
                      setQuestions((list) => list.map((item) => (item.key === q.key ? next : item)))
                    }
                    onRemove={() => setQuestions((list) => list.filter((item) => item.key !== q.key))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}

function SortableQuestionCard({
  q,
  allKeys,
  onChange,
  onRemove,
}: {
  q: SurveyQuestion;
  allKeys: string[];
  onChange: (q: SurveyQuestion) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.key });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  const logic: QuestionLogic = q.logic ?? {
    whenQuestionKey: '',
    operator: 'equals',
    value: '',
    showQuestionKeys: [],
    hideQuestionKeys: [],
  };

  const setLogic = (patch: Partial<QuestionLogic>) => {
    onChange({
      ...q,
      logic: { ...logic, ...patch },
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-4 shadow-card"
    >
      <div className="flex gap-2 items-start">
        <button
          type="button"
          className="mt-2 cursor-grab rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--surface)]"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          ⋮⋮
        </button>
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex flex-wrap gap-2">
            <select
              value={q.type}
              onChange={(e) => {
                const type = e.target.value as QuestionType;
                onChange({
                  ...q,
                  type,
                  options: ['multiple_choice', 'dropdown'].includes(type) ? q.options?.length ? q.options : ['A', 'B'] : [],
                });
              }}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={q.required ?? false}
                onChange={(e) => onChange({ ...q, required: e.target.checked })}
                className="accent-primary"
              />
              Required
            </label>
          </div>
          <input
            value={q.label}
            onChange={(e) => onChange({ ...q, label: e.target.value })}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium"
            placeholder="Question label"
          />
          <input
            value={q.description ?? ''}
            onChange={(e) => onChange({ ...q, description: e.target.value })}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            placeholder="Helper text (optional)"
          />
          {['multiple_choice', 'dropdown'].includes(q.type) && (
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Options (one per line)</label>
              <textarea
                value={(q.options ?? []).join('\n')}
                onChange={(e) =>
                  onChange({
                    ...q,
                    options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                  })
                }
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm min-h-[72px] font-mono"
              />
            </div>
          )}
          {q.type === 'rating' && (
            <div className="flex gap-3">
              <div>
                <label className="text-xs">Min</label>
                <input
                  type="number"
                  value={q.minRating ?? 1}
                  onChange={(e) => onChange({ ...q, minRating: Number(e.target.value) })}
                  className="mt-1 w-20 rounded border border-[var(--border)] px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs">Max</label>
                <input
                  type="number"
                  value={q.maxRating ?? 5}
                  onChange={(e) => onChange({ ...q, maxRating: Number(e.target.value) })}
                  className="mt-1 w-20 rounded border border-[var(--border)] px-2 py-1 text-sm"
                />
              </div>
            </div>
          )}

          <details className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <summary className="cursor-pointer text-sm font-medium">Conditional logic</summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs text-[var(--text-secondary)]">When question (key)</label>
                <select
                  value={logic.whenQuestionKey}
                  onChange={(e) => setLogic({ whenQuestionKey: e.target.value })}
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
                >
                  <option value="">— None —</option>
                  {allKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs">Operator</label>
                <select
                  value={logic.operator}
                  onChange={(e) => setLogic({ operator: e.target.value as QuestionLogic['operator'] })}
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
                >
                  {OPS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs">Value</label>
                <input
                  value={logic.value === null || logic.value === undefined ? '' : String(logic.value)}
                  onChange={(e) => setLogic({ value: e.target.value })}
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
                  disabled={logic.operator === 'is_empty'}
                />
              </div>
              <div>
                <label className="text-xs">Show keys (comma)</label>
                <input
                  value={(logic.showQuestionKeys ?? []).join(', ')}
                  onChange={(e) =>
                    setLogic({
                      showQuestionKeys: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs">Hide keys (comma)</label>
                <input
                  value={(logic.hideQuestionKeys ?? []).join(', ')}
                  onChange={(e) =>
                    setLogic({
                      hideQuestionKeys: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          </details>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-alert text-sm hover:underline shrink-0"
          aria-label="Remove question"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

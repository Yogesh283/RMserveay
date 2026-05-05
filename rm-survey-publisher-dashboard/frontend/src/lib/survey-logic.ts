import type { QuestionLogic, SurveyQuestion } from '@/types';

export function evalLogicCondition(logic: QuestionLogic | undefined, answers: Record<string, unknown>): boolean {
  if (!logic?.whenQuestionKey) return false;
  const v = answers[logic.whenQuestionKey];
  const target = logic.value;
  switch (logic.operator) {
    case 'equals':
      return v === target || String(v) === String(target);
    case 'not_equals':
      return v !== target && String(v) !== String(target);
    case 'contains':
      return String(v ?? '').toLowerCase().includes(String(target ?? '').toLowerCase());
    case 'is_empty':
      return v === '' || v === null || v === undefined;
    default:
      return false;
  }
}

/** Compute which question keys are visible after applying conditional rules in survey order. */
export function computeVisibleKeys(questions: SurveyQuestion[], answers: Record<string, unknown>): Set<string> {
  const keys = questions.map((q) => q.key);
  const visible = new Set(keys);
  for (const q of questions) {
    const L = q.logic;
    if (!L?.whenQuestionKey) continue;
    if (!evalLogicCondition(L, answers)) continue;
    for (const k of L.hideQuestionKeys ?? []) visible.delete(k);
    for (const k of L.showQuestionKeys ?? []) visible.add(k);
  }
  return visible;
}

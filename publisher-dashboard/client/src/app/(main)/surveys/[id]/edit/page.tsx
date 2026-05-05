'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SurveyBuilder } from '@/components/survey-builder';
import { apiFetch, ApiError } from '@/lib/api';
import type { Survey } from '@/types';

export default function EditSurveyPage() {
  const params = useParams();
  const id = String(params.id ?? '');
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await apiFetch<{ survey: Survey }>(`/api/surveys/${id}`);
        setSurvey(data.survey);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Not found');
      }
    })();
  }, [id]);

  if (error) {
    return <p className="text-alert">{error}</p>;
  }
  if (!survey) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <SurveyBuilder survey={survey} />;
}

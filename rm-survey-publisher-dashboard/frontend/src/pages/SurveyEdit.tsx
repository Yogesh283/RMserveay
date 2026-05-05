import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { axiosApi, ApiError } from '@/api/client';
import { SurveyBuilder } from '@/components/SurveyBuilder';
import type { Survey } from '@/types';

export default function SurveyEdit() {
  const { id } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await axiosApi.get<{ survey: Survey }>(`/surveys/${id}`);
        const s = data.survey;
        setSurvey({ ...s, _id: String(s._id ?? s.id), questions: s.questions ?? [] });
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Not found');
      }
    })();
  }, [id]);

  if (error) return <p className="text-alert">{error}</p>;
  if (!survey) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <SurveyBuilder survey={survey} />;
}

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { axiosApi } from '@/api/client';

export default function Analytics() {
  const [data, setData] = useState<{
    completionRate: number;
    totalResponses: number;
    completed: number;
    dropped: number;
    dropOffByQuestion: { questionKey: string; count: number }[];
    surveys: { title: string; response_count: number }[];
  } | null>(null);

  useEffect(() => {
    axiosApi.get('/analytics/overview').then((r) => setData(r.data));
  }, []);

  if (!data) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const dropChart = data.dropOffByQuestion.map((d) => ({ name: d.questionKey || '—', dropOffs: d.count }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-4">
        <Tile title="Completion %" value={data.completionRate} accent="text-primary" />
        <Tile title="Responses" value={data.totalResponses} />
        <Tile title="Completed" value={data.completed} accent="text-earnings" />
        <Tile title="Drop-offs" value={data.dropped} accent="text-alert" />
      </div>
      <div className="rounded-[10px] border border-[var(--border)] p-4">
        <h2 className="text-sm font-semibold mb-4">Drop-off by question</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dropChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="dropOffs" fill="#FA383E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-[10px] border border-[var(--border)] p-4">
        <h2 className="text-sm font-semibold mb-2">Volume by survey</h2>
        <ul className="text-sm divide-y divide-[var(--border)]">
          {data.surveys.map((s, i) => (
            <li key={i} className="py-2 flex justify-between">
              <span>{s.title}</span>
              <span className="text-primary font-medium">{s.response_count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Tile({ title, value, accent }: { title: string; value: number; accent?: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] p-4 shadow-card">
      <p className="text-xs text-[var(--text-secondary)]">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? ''}`}>{value}</p>
    </div>
  );
}

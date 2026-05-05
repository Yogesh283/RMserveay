'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiFetch } from '@/lib/api';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<{
    completionRate: number;
    totalResponses: number;
    completed: number;
    dropped: number;
    dropOffByQuestion: { questionKey: string; count: number }[];
    surveys: { title: string; responseCount: number }[];
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<NonNullable<typeof overview>>('/api/analytics/overview');
        setOverview(data);
      } catch {
        setOverview(null);
      }
    })();
  }, []);

  if (!overview) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const dropData = overview.dropOffByQuestion.map((d) => ({
    name: d.questionKey || '—',
    dropOffs: d.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-[var(--text-secondary)]">Completion, drop-offs, and survey volume</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Completion rate" value={`${overview.completionRate}%`} accent="text-primary" />
        <Metric title="Total responses" value={overview.totalResponses} />
        <Metric title="Completed" value={overview.completed} accent="text-earnings" />
        <Metric title="Drop-offs" value={overview.dropped} accent="text-alert" />
      </div>

      <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-4 shadow-card">
        <h2 className="text-sm font-semibold mb-4">Drop-off by question</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dropData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--text-secondary)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="dropOffs" fill="#FA383E" radius={[6, 6, 0, 0]} name="Drop-offs" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card">
        <h2 className="text-sm font-semibold mb-3">Responses by survey</h2>
        <ul className="divide-y divide-[var(--border)]">
          {overview.surveys.map((s, i) => (
            <li key={i} className="py-2 flex justify-between text-sm">
              <span>{s.title}</span>
              <span className="font-medium text-primary">{s.responseCount}</span>
            </li>
          ))}
          {overview.surveys.length === 0 && (
            <li className="py-4 text-[var(--text-secondary)]">No surveys yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Metric({ title, value, accent }: { title: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-4 shadow-card">
      <p className="text-xs text-[var(--text-secondary)] uppercase">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? ''}`}>{value}</p>
    </div>
  );
}

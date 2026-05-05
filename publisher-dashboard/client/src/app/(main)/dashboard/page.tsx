'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

type Stats = {
  totalSurveys: number;
  activeSurveys: number;
  totalResponses: number;
  totalEarningsUsd: number;
};

export default function DashboardPage() {
  const { user, refresh } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [performance, setPerformance] = useState<{ date: string; responses: number }[]>([]);
  const [barData, setBarData] = useState<{ name: string; responses: number; earnings: number }[]>([]);
  const [pieData, setPieData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [activity, setActivity] = useState<{ id: string; time: string; text: string; type: string }[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, perf, bar, pie, act] = await Promise.all([
          apiFetch<Stats>('/api/dashboard/stats'),
          apiFetch<{ series: { date: string; responses: number }[] }>('/api/dashboard/performance'),
          apiFetch<{ items: { name: string; responses: number; earnings: number }[] }>('/api/dashboard/responses-by-survey'),
          apiFetch<{ segments: { name: string; value: number; color: string }[] }>('/api/dashboard/completion-split'),
          apiFetch<{ activity: { id: string; time: string; text: string; type: string }[] }>('/api/dashboard/recent-activity'),
        ]);
        setStats(s);
        setPerformance(perf.series);
        setBarData(bar.items);
        setPieData(pie.segments);
        setActivity(act.activity);
        await refresh();

        const autoInsights: string[] = [];
        if (s.totalSurveys > 0 && s.activeSurveys === 0) {
          autoInsights.push('No active surveys — publish or re-activate a survey to collect responses.');
        }
        if (pie.segments[1]?.value > pie.segments[0]?.value) {
          autoInsights.push('Drop-offs exceed completions — shorten the survey or improve the first screen.');
        }
        if (s.totalResponses > 0 && s.totalEarningsUsd === 0) {
          autoInsights.push('Responses recorded — earnings accrue per completed response policy.');
        }
        if (autoInsights.length === 0) {
          autoInsights.push('Completion and volume look healthy — keep monitoring weekly trends.');
        }
        setInsights(autoInsights);
      } catch {
        /* handled by empty state */
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  if (loading || !stats) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const pieColors = pieData.map((p) => p.color);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)]">Welcome back, {user?.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total surveys" value={stats.totalSurveys} />
        <StatCard label="Active surveys" value={stats.activeSurveys} accent="text-primary" />
        <StatCard label="Total responses" value={stats.totalResponses} />
        <StatCard label="Total earnings" value={`$${Number(stats.totalEarningsUsd).toFixed(2)}`} accent="text-earnings" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-card border border-[var(--border)] bg-[var(--bg)] p-4 shadow-card dark:shadow-card-dark">
          <h2 className="text-sm font-semibold mb-4">Survey performance (14 days)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--text-secondary)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                />
                <Line type="monotone" dataKey="responses" stroke="#1877F2" strokeWidth={2} dot={false} name="Responses" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-4 shadow-card dark:shadow-card-dark">
          <h2 className="text-sm font-semibold mb-4">Completion rate</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} label>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i] ?? '#1877F2'} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-4 shadow-card dark:shadow-card-dark">
        <h2 className="text-sm font-semibold mb-4">Responses per survey</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--text-secondary)" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--text-secondary)" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="responses" fill="#1877F2" radius={[6, 6, 0, 0]} name="Responses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-4 shadow-card">
          <h2 className="text-sm font-semibold mb-3">Auto insights</h2>
          <ul className="space-y-2">
            {insights.map((line, i) => (
              <li key={i} className="text-sm text-[var(--text-secondary)] flex gap-2">
                <span className="text-primary">•</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-4 shadow-card">
          <h2 className="text-sm font-semibold mb-3">Recent activity</h2>
          <ul className="divide-y divide-[var(--border)] max-h-80 overflow-auto">
            {activity.length === 0 ? (
              <li className="py-3 text-sm text-[var(--text-secondary)]">No activity yet.</li>
            ) : (
              activity.map((a) => (
                <li key={a.id} className="py-3 flex gap-3 text-sm">
                  <span
                    className={`mt-1 h-2 w-2 rounded-full shrink-0 ${a.type === 'alert' ? 'bg-alert' : 'bg-earnings'}`}
                  />
                  <div>
                    <p>{a.text}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{new Date(a.time).toLocaleString()}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card transition-card hover:shadow-lg">
      <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ?? 'text-[var(--text)]'}`}>{value}</p>
    </div>
  );
}

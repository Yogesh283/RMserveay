import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { axiosApi } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const [stats, setStats] = useState<{ totalSurveys: number; activeSurveys: number; totalResponses: number; totalEarningsUsd: number } | null>(
    null,
  );
  const [performance, setPerformance] = useState<{ date: string; responses: number }[]>([]);
  const [barData, setBarData] = useState<{ name: string; responses: number; earnings: number }[]>([]);
  const [pieData, setPieData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [activity, setActivity] = useState<{ id: string; time: string; text: string; type: string }[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, perf, bar, pie, act] = await Promise.all([
          axiosApi.get('/dashboard/stats'),
          axiosApi.get('/dashboard/performance'),
          axiosApi.get('/dashboard/responses-by-survey'),
          axiosApi.get('/dashboard/completion-split'),
          axiosApi.get('/dashboard/recent-activity'),
        ]);
        setStats(s.data);
        setPerformance(perf.data.series);
        setBarData(bar.data.items);
        setPieData(pie.data.segments);
        setActivity(act.data.activity);
        await refresh();

        const auto: string[] = [];
        const st = s.data;
        if (st.totalSurveys > 0 && st.activeSurveys === 0) auto.push('No active surveys — publish one to collect responses.');
        const segments = pie.data.segments;
        if (segments[1]?.value > segments[0]?.value) auto.push('Drop-offs exceed completions — shorten the flow.');
        auto.push('Wallet balance reflects credits stored in the wallets table.');
        setInsights(auto.length ? auto : ['Monitor trends weekly.']);
      } catch {
        /* ignore */
      }
    })();
  }, [refresh]);

  if (!stats) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)]">Welcome, {user?.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total surveys" value={stats.totalSurveys} />
        <Stat label="Active surveys" value={stats.activeSurveys} accent="text-primary" />
        <Stat label="Total responses" value={stats.totalResponses} />
        <Stat label="Wallet balance (USD)" value={`$${stats.totalEarningsUsd.toFixed(2)}`} accent="text-earnings" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg)] p-4 shadow-card">
          <h2 className="text-sm font-semibold mb-4">Performance (14 days)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="responses" stroke="#1877F2" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg)] p-4 shadow-card">
          <h2 className="text-sm font-semibold mb-4">Completion rate</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={pieData[i]?.color ?? '#1877F2'} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg)] p-4 shadow-card">
        <h2 className="text-sm font-semibold mb-4">Responses per survey</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="responses" fill="#1877F2" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[10px] border border-[var(--border)] p-4 shadow-card">
          <h2 className="text-sm font-semibold mb-2">Auto insights</h2>
          <ul className="text-sm text-[var(--text-secondary)] space-y-2">
            {insights.map((x, i) => (
              <li key={i}>• {x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-[10px] border border-[var(--border)] p-4 shadow-card">
          <h2 className="text-sm font-semibold mb-2">Recent activity</h2>
          <ul className="divide-y divide-[var(--border)] max-h-72 overflow-auto text-sm">
            {activity.map((a) => (
              <li key={a.id} className="py-2">
                <p>{a.text}</p>
                <p className="text-xs text-[var(--text-secondary)]">{new Date(a.time).toLocaleString()}</p>
              </li>
            ))}
            {activity.length === 0 && <li className="py-4 text-[var(--text-secondary)]">No activity yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card">
      <p className="text-xs font-medium text-[var(--text-secondary)] uppercase">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ?? ''}`}>{value}</p>
    </div>
  );
}

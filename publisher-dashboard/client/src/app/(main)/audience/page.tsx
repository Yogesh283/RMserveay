'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Row = {
  id: string;
  survey: string;
  age?: number;
  gender: string;
  location: string;
  engaged: boolean;
  submittedAt: string;
};

export default function AudiencePage() {
  const [users, setUsers] = useState<Row[]>([]);
  const [metrics, setMetrics] = useState({ total: 0, engaged: 0, engagementRate: 0 });
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (gender) qs.set('gender', gender);
      if (location) qs.set('location', location);
      if (ageMin) qs.set('ageMin', ageMin);
      if (ageMax) qs.set('ageMax', ageMax);
      const data = await apiFetch<{ users: Row[]; metrics: typeof metrics }>(
        `/api/audience/users?${qs.toString()}`,
      );
      setUsers(data.users);
      setMetrics(data.metrics);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [gender, location, ageMin, ageMax]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audience</h1>
        <p className="text-sm text-[var(--text-secondary)]">Respondent profiles from survey submissions</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card">
          <p className="text-xs text-[var(--text-secondary)] uppercase">Rows (sample)</p>
          <p className="mt-1 text-2xl font-bold">{metrics.total}</p>
        </div>
        <div className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card">
          <p className="text-xs text-[var(--text-secondary)] uppercase">Completed</p>
          <p className="mt-1 text-2xl font-bold text-earnings">{metrics.engaged}</p>
        </div>
        <div className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card">
          <p className="text-xs text-[var(--text-secondary)] uppercase">Engagement rate</p>
          <p className="mt-1 text-2xl font-bold text-primary">{metrics.engagementRate}%</p>
        </div>
      </div>

      <div className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Gender</label>
          <input
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            placeholder="e.g. female"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Location contains</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Age min</label>
          <input
            type="number"
            value={ageMin}
            onChange={(e) => setAgeMin(e.target.value)}
            className="mt-1 block w-24 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Age max</label>
          <input
            type="number"
            value={ageMax}
            onChange={(e) => setAgeMax(e.target.value)}
            className="mt-1 block w-24 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          Apply
        </button>
      </div>

      <div className="rounded-card border border-[var(--border)] overflow-hidden shadow-card bg-[var(--bg)]">
        {loading ? (
          <p className="p-8 text-center text-[var(--text-secondary)]">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)] text-left text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3">Survey</th>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Engaged</th>
                  <th className="px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--surface)]/60">
                    <td className="px-4 py-3">{u.survey}</td>
                    <td className="px-4 py-3">{u.age ?? '—'}</td>
                    <td className="px-4 py-3">{u.gender}</td>
                    <td className="px-4 py-3">{u.location}</td>
                    <td className="px-4 py-3">
                      <span className={u.engaged ? 'text-earnings font-medium' : 'text-alert'}>
                        {u.engaged ? 'Yes' : 'Drop-off'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {new Date(u.submittedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="p-8 text-center text-[var(--text-secondary)]">No respondents match filters.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

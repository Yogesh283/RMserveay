import { useCallback, useEffect, useState } from 'react';
import { axiosApi } from '@/api/client';

export default function Audience() {
  const [users, setUsers] = useState<
    { id: string; survey: string; age?: number; gender: string; location: string; engaged: boolean; submittedAt: string }[]
  >([]);
  const [metrics, setMetrics] = useState({ total: 0, engaged: 0, engagementRate: 0 });
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (gender) qs.set('gender', gender);
    if (location) qs.set('location', location);
    if (ageMin) qs.set('ageMin', ageMin);
    if (ageMax) qs.set('ageMax', ageMax);
    const { data } = await axiosApi.get(`/audience/users?${qs.toString()}`);
    setUsers(data.users);
    setMetrics(data.metrics);
  }, [gender, location, ageMin, ageMax]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audience</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Sample rows" value={metrics.total} />
        <Metric title="Completed" value={metrics.engaged} accent="text-earnings" />
        <Metric title="Engagement %" value={metrics.engagementRate} accent="text-primary" />
      </div>
      <div className="flex flex-wrap gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <input placeholder="Gender" value={gender} onChange={(e) => setGender(e.target.value)} className="rounded border px-2 py-1 text-sm" />
        <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="rounded border px-2 py-1 text-sm" />
        <input placeholder="Age min" type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} className="w-24 rounded border px-2 py-1 text-sm" />
        <input placeholder="Age max" type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} className="w-24 rounded border px-2 py-1 text-sm" />
        <button type="button" onClick={() => load()} className="rounded bg-primary px-3 py-1 text-sm text-white">
          Apply
        </button>
      </div>
      <div className="overflow-x-auto rounded-[10px] border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)]">
            <tr>
              <th className="px-3 py-2 text-left">Survey</th>
              <th className="px-3 py-2">Age</th>
              <th className="px-3 py-2">Gender</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Engaged</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2">{u.survey}</td>
                <td className="px-3 py-2">{u.age ?? '—'}</td>
                <td className="px-3 py-2">{u.gender}</td>
                <td className="px-3 py-2">{u.location}</td>
                <td className={`px-3 py-2 ${u.engaged ? 'text-earnings' : 'text-alert'}`}>{u.engaged ? 'Yes' : 'Drop-off'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ title, value, accent }: { title: string; value: number; accent?: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card">
      <p className="text-xs text-[var(--text-secondary)] uppercase">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? ''}`}>{value}</p>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { axiosApi, ApiError } from '@/api/client';
import type { Survey } from '@/types';

export default function Surveys() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const { data } = await axiosApi.get<{ surveys: Survey[] }>(`/surveys?${qs.toString()}`);
      setSurveys(data.surveys);
    } finally {
      setLoading(false);
    }
  }, [status, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus(s: Survey, active: boolean) {
    const sid = s._id ?? s.id;
    try {
      await axiosApi.patch(`/surveys/${sid}/status`, { status: active ? 'active' : 'inactive' });
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Failed');
    }
  }

  async function remove(id: string | number) {
    if (!confirm('Delete survey and responses?')) return;
    try {
      await axiosApi.delete(`/surveys/${id}`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Failed');
    }
  }

  const origin = window.location.origin;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Surveys</h1>
          <p className="text-sm text-[var(--text-secondary)]">CRUD, filters, public link</p>
        </div>
        <Link to="/surveys/new" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
          Create survey
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-end rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)]">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-lg border px-2 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)]">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-lg border px-2 py-2 text-sm" />
        </div>
        <button type="button" onClick={load} className="rounded-lg border px-4 py-2 text-sm">
          Apply
        </button>
      </div>

      <div className="rounded-[10px] border border-[var(--border)] overflow-hidden shadow-card bg-[var(--bg)]">
        {loading ? (
          <p className="p-8 text-center">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)] text-left text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Responses</th>
                  <th className="px-4 py-3">Earnings</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {surveys.map((s) => {
                  const sid = s._id ?? String(s.id ?? '');
                  return (
                    <tr key={sid}>
                      <td className="px-4 py-3 font-medium">{s.title}</td>
                      <td className="px-4 py-3">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={s.status === 'active'}
                            disabled={s.status === 'draft'}
                            onChange={(e) => toggleStatus(s, e.target.checked)}
                            className="accent-primary"
                          />
                          <span className="capitalize">{s.status}</span>
                        </label>
                      </td>
                      <td className="px-4 py-3">{s.responseCount ?? 0}</td>
                      <td className="px-4 py-3 text-earnings">${(s.earningsTotalUsd ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <Link to={`/surveys/${sid}/edit`} className="text-primary">
                          Edit
                        </Link>
                        <a href={`${origin}/p/${sid}`} target="_blank" rel="noreferrer" className="text-[var(--text-secondary)]">
                          View
                        </a>
                        <button type="button" className="text-alert" onClick={() => remove(sid)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

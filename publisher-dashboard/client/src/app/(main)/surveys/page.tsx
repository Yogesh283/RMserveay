'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import type { Survey } from '@/types';

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const q = qs.toString();
      const data = await apiFetch<{ surveys: Survey[] }>(`/api/surveys${q ? `?${q}` : ''}`);
      setSurveys(data.surveys);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load surveys');
    } finally {
      setLoading(false);
    }
  }, [status, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus(s: Survey, next: 'active' | 'inactive') {
    try {
      await apiFetch(`/api/surveys/${s._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Update failed');
    }
  }

  async function removeSurvey(id: string) {
    if (!confirm('Delete this survey and its responses?')) return;
    try {
      await apiFetch(`/api/surveys/${id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Delete failed');
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Surveys</h1>
          <p className="text-sm text-[var(--text-secondary)]">Manage status, responses, and earnings</p>
        </div>
        <Link
          href="/surveys/new"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 transition-card"
        >
          Create survey
        </Link>
      </div>

      <div className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Updated from</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Updated to</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg)]"
        >
          Apply filters
        </button>
      </div>

      {error ? <div className="text-sm text-alert">{error}</div> : null}

      <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--text-secondary)]">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)] text-left text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Responses</th>
                  <th className="px-4 py-3 font-medium">Earnings</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {surveys.map((s) => (
                  <tr key={s._id} className="hover:bg-[var(--surface)]/80 transition-card">
                    <td className="px-4 py-3 font-medium">{s.title}</td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={s.status === 'active'}
                          disabled={s.status === 'draft'}
                          onChange={(e) => toggleStatus(s, e.target.checked ? 'active' : 'inactive')}
                          className="accent-primary rounded"
                        />
                        <span className="capitalize text-[var(--text-secondary)]">{s.status}</span>
                      </label>
                      {s.status === 'draft' && (
                        <span className="block text-xs text-[var(--text-secondary)] mt-1">Publish from editor</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{s.responseCount}</td>
                    <td className="px-4 py-3 text-earnings font-medium">${Number(s.earningsTotalUsd).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <Link href={`/surveys/${s._id}/edit`} className="text-primary hover:underline">
                        Edit
                      </Link>
                      <a
                        href={`${origin}/p/${s._id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--text-secondary)] hover:text-primary"
                      >
                        View
                      </a>
                      <button type="button" className="text-alert hover:underline" onClick={() => removeSurvey(s._id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {surveys.length === 0 && !loading && (
              <p className="p-8 text-center text-[var(--text-secondary)]">No surveys yet. Create one to get started.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

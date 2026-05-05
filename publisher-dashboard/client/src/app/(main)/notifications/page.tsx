'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Notif = {
  _id: string;
  title: string;
  body: string;
  read: boolean;
  type?: string;
  createdAt: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ notifications: Notif[] }>('/api/notifications');
      setItems(data.notifications);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function readOne(id: string) {
    await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    load();
  }

  async function readAll() {
    await apiFetch('/api/notifications/read-all', { method: 'POST' });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-[var(--text-secondary)]">Survey activity and earnings alerts</p>
        </div>
        <button
          type="button"
          onClick={readAll}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface)]"
        >
          Mark all read
        </button>
      </div>

      <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] divide-y divide-[var(--border)] shadow-card">
        {loading ? (
          <p className="p-8 text-center text-[var(--text-secondary)]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-[var(--text-secondary)]">You&apos;re all caught up.</p>
        ) : (
          items.map((n) => (
            <button
              key={n._id}
              type="button"
              onClick={() => !n.read && readOne(n._id)}
              className={`w-full text-left px-4 py-4 hover:bg-[var(--surface)] transition-card flex gap-3 ${
                !n.read ? 'bg-primary/5' : ''
              }`}
            >
              <span
                className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                  n.type === 'earning' ? 'bg-earnings' : n.type === 'withdrawal' ? 'bg-alert' : 'bg-primary'
                }`}
              />
              <div className="min-w-0">
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{n.body}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

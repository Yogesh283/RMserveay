import { useCallback, useEffect, useState } from 'react';
import { axiosApi } from '@/api/client';

type Row = { _id: string; title: string; body: string; read: boolean };

export default function Notifications() {
  const [items, setItems] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const { data } = await axiosApi.get<{ notifications: Row[] }>('/notifications');
    setItems(data.notifications);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function readOne(id: string) {
    await axiosApi.patch(`/notifications/${id}/read`);
    load();
  }

  async function readAll() {
    await axiosApi.post('/notifications/read-all');
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button type="button" onClick={readAll} className="text-sm border rounded-lg px-3 py-1.5">
          Mark all read
        </button>
      </div>
      <div className="rounded-[10px] border border-[var(--border)] divide-y divide-[var(--border)]">
        {items.map((n) => (
          <button
            key={n._id}
            type="button"
            onClick={() => !n.read && readOne(n._id)}
            className={`w-full text-left px-4 py-4 ${n.read ? '' : 'bg-primary/5'}`}
          >
            <p className="font-medium">{n.title}</p>
            <p className="text-sm text-[var(--text-secondary)]">{n.body}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

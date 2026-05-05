'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

type Tx = {
  _id: string;
  type: string;
  amountUsd: number;
  status: string;
  description?: string;
  createdAt: string;
};

type EarningRow = { id: string; amountUsd: number; surveyTitle?: string; createdAt: string; description?: string };

export default function EarningsPage() {
  const { refresh } = useAuth();
  const [balance, setBalance] = useState(0);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [series, setSeries] = useState<{ date: string; amount: number }[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [earnings, setEarnings] = useState<EarningRow[]>([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const [sum, chart, tx, earn] = await Promise.all([
        apiFetch<{ balanceUsd: number }>('/api/earnings/summary'),
        apiFetch<{ series: { date: string; amount: number }[] }>(`/api/earnings/chart?range=${range}`),
        apiFetch<{ transactions: Tx[] }>('/api/transactions'),
        apiFetch<{ earnings: EarningRow[] }>('/api/earnings/list'),
      ]);
      setBalance(sum.balanceUsd);
      setSeries(chart.series);
      setTransactions(tx.transactions);
      setEarnings(earn.earnings);
      await refresh();
    } catch {
      /* ignore */
    }
  }, [range, refresh]);

  useEffect(() => {
    load();
  }, [load]);

  async function withdraw(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setErr('');
    const n = Number(amount);
    if (!n || n < 1) {
      setErr('Enter amount ≥ 1');
      return;
    }
    try {
      await apiFetch('/api/transactions/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amountUsd: n, description: note || undefined }),
      });
      setMsg('Withdrawal requested.');
      setAmount('');
      setNote('');
      load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Request failed');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-sm text-[var(--text-secondary)]">Balance, payouts, and per-response credits</p>
      </div>

      <div className="rounded-card border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase">Available balance</p>
          <p className="text-3xl font-bold text-earnings mt-1">${balance.toFixed(2)}</p>
        </div>
        <form onSubmit={withdraw} className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-[var(--text-secondary)]">Withdraw (USD)</label>
            <input
              type="number"
              min={1}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-32 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)]">Note</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 block w-48 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
            Request
          </button>
        </form>
      </div>
      {msg ? <p className="text-sm text-earnings">{msg}</p> : null}
      {err ? <p className="text-sm text-alert">{err}</p> : null}

      <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-4 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Earnings over time</h2>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as typeof range)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
          >
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
          </select>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="earn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#42B72A" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#42B72A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              />
              <Area type="monotone" dataKey="amount" stroke="#42B72A" fill="url(#earn)" name="USD" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-4 shadow-card">
          <h2 className="text-sm font-semibold mb-3">Transaction history</h2>
          <ul className="divide-y divide-[var(--border)] max-h-80 overflow-auto text-sm">
            {transactions.map((t) => (
              <li key={t._id} className="py-2 flex justify-between gap-2">
                <div>
                  <p className="font-medium capitalize">{t.type}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{t.description}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className={t.type === 'withdrawal' ? 'text-alert font-medium' : 'text-earnings'}>
                    {t.type === 'withdrawal' ? '-' : '+'}${t.amountUsd.toFixed(2)}
                  </p>
                  <p className="text-xs capitalize text-[var(--text-secondary)]">{t.status}</p>
                </div>
              </li>
            ))}
            {transactions.length === 0 && <li className="py-4 text-[var(--text-secondary)]">No transactions yet.</li>}
          </ul>
        </div>
        <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-4 shadow-card">
          <h2 className="text-sm font-semibold mb-3">Per-response credits</h2>
          <ul className="divide-y divide-[var(--border)] max-h-80 overflow-auto text-sm">
            {earnings.map((e) => (
              <li key={e.id} className="py-2 flex justify-between">
                <div>
                  <p>{e.surveyTitle ?? 'Survey'}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{new Date(e.createdAt).toLocaleString()}</p>
                </div>
                <p className="text-earnings font-medium">+${e.amountUsd.toFixed(2)}</p>
              </li>
            ))}
            {earnings.length === 0 && <li className="py-4 text-[var(--text-secondary)]">No earnings yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

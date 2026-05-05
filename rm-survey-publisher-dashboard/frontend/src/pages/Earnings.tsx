import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { axiosApi, ApiError } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

export default function Earnings() {
  const { refresh } = useAuth();
  const [balance, setBalance] = useState(0);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [series, setSeries] = useState<{ date: string; amount: number }[]>([]);
  const [transactions, setTransactions] = useState<Array<Record<string, unknown>>>([]);
  const [earnings, setEarnings] = useState<Array<{ id: number; amountUsd: number; surveyTitle?: string; createdAt: string }>>([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const [sum, chart, tx, earn] = await Promise.all([
      axiosApi.get<{ balanceUsd: number }>('/earnings/summary'),
      axiosApi.get(`/earnings/chart?range=${range}`),
      axiosApi.get('/transactions'),
      axiosApi.get('/earnings/list'),
    ]);
    setBalance(sum.data.balanceUsd);
    setSeries(chart.data.series);
    setTransactions(tx.data.transactions);
    setEarnings(earn.data.earnings);
    await refresh();
  }, [range, refresh]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function withdraw(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    setErr('');
    const n = Number(amount);
    if (!n || n < 1) {
      setErr('Enter ≥ 1');
      return;
    }
    try {
      await axiosApi.post('/transactions/withdraw', { amountUsd: n, description: note || undefined });
      setMsg('Withdrawal requested.');
      setAmount('');
      setNote('');
      load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Earnings</h1>
      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-wrap justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-[var(--text-secondary)]">Wallet balance</p>
          <p className="text-3xl font-bold text-earnings">${balance.toFixed(2)}</p>
        </div>
        <form onSubmit={withdraw} className="flex flex-wrap gap-2 items-end">
          <input type="number" min={1} placeholder="USD" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded border px-2 py-1 text-sm w-28" />
          <input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} className="rounded border px-2 py-1 text-sm w-40" />
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm text-white">
            Withdraw
          </button>
        </form>
      </div>
      {msg && <p className="text-earnings text-sm">{msg}</p>}
      {err && <p className="text-alert text-sm">{err}</p>}

      <div className="rounded-[10px] border border-[var(--border)] p-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-semibold">Earnings trend</span>
          <select value={range} onChange={(e) => setRange(e.target.value as typeof range)} className="text-sm rounded border px-2 py-1">
            <option value="7d">7d</option>
            <option value="30d">30d</option>
            <option value="90d">90d</option>
          </select>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#42B72A" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#42B72A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="amount" stroke="#42B72A" fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[10px] border border-[var(--border)] p-4">
          <h2 className="font-semibold text-sm mb-2">Publisher transactions</h2>
          <ul className="text-sm divide-y divide-[var(--border)] max-h-64 overflow-auto">
            {transactions.map((t) => (
              <li key={String(t.id)} className="py-2 flex justify-between">
                <span>{String(t.type)} — {String(t.description ?? '')}</span>
                <span className={t.type === 'withdrawal' ? 'text-alert' : 'text-earnings'}>${Number(t.amount).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[10px] border border-[var(--border)] p-4">
          <h2 className="font-semibold text-sm mb-2">Credits</h2>
          <ul className="text-sm divide-y divide-[var(--border)] max-h-64 overflow-auto">
            {earnings.map((e) => (
              <li key={e.id} className="py-2 flex justify-between">
                <span>{e.surveyTitle}</span>
                <span className="text-earnings">+${e.amountUsd.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import PubButton from '../components/PubButton';
import PubCard from '../components/PubCard';
import PubPageFrame from '../components/PubPageFrame';
import PubPageHeader from '../components/PubPageHeader';
import { formatInrFull, publisherGet } from '../lib/publisherApi';
import { pub } from '../ui/pubTheme';

export default function PublisherEarningsPage() {
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [balance, setBalance] = useState(0);
    const [series, setSeries] = useState([]);
    const [tx, setTx] = useState([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setErr(null);
            setLoading(true);
            try {
                const [s, c, l] = await Promise.all([
                    publisherGet('publisher/earnings/summary'),
                    publisherGet('publisher/earnings/chart?range=30d'),
                    publisherGet('publisher/earnings'),
                ]);
                if (cancelled) {
                    return;
                }
                setBalance(s.data.balance ?? 0);
                setSeries(c.data.series ?? []);
                setTx(l.data.earnings ?? []);
            } catch (e) {
                if (!cancelled) {
                    setErr(e.response?.data?.message ?? e.message ?? 'Could not load earnings');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const maxAmt = Math.max(...series.map((x) => x.amount), 1);

    if (loading) {
        return (
            <PubPageFrame>
                <p className={`py-16 text-center text-sm ${pub.muted}`}>Loading earnings…</p>
            </PubPageFrame>
        );
    }

    if (err) {
        return (
            <PubPageFrame>
                <PubCard className="border-red-500/30 p-6">
                    <p className="text-red-400">{err}</p>
                </PubCard>
            </PubPageFrame>
        );
    }

    return (
        <PubPageFrame>
            <PubPageHeader title="Earnings" subtitle="Live balance and history from the earnings table." />

            <PubCard className="p-6" hover>
                <p className={`text-sm ${pub.muted}`}>Total credited (survey responses)</p>
                <p className="mt-2 bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                    {formatInrFull(balance)}
                </p>
                <PubButton className="mt-5" type="button">
                    Request withdrawal
                </PubButton>
            </PubCard>

            <PubCard className="p-5">
                <p className="text-sm font-semibold text-white">Daily trend</p>
                <p className={`mt-0.5 text-xs ${pub.muted}`}>Last 30 days — amounts credited</p>
                <div className="mt-4 flex h-40 items-end gap-1">
                    {series.length ? (
                        series.map((row, i) => (
                            <div
                                key={row.date + i}
                                className="flex-1 rounded-t-lg transition duration-200 hover:brightness-110"
                                style={{
                                    height: `${Math.max(8, (row.amount / maxAmt) * 100)}%`,
                                    background: 'linear-gradient(180deg, #6C4CF1, #8E6BFF)',
                                    opacity: 0.65,
                                }}
                                title={`${row.date}: ${formatInrFull(row.amount)}`}
                            />
                        ))
                    ) : (
                        <p className={`w-full py-8 text-center text-xs ${pub.muted}`}>No earnings yet</p>
                    )}
                </div>
            </PubCard>

            <div className="space-y-2 md:hidden">
                {tx.length === 0 ? (
                    <PubCard className="p-4">
                        <p className={`text-sm ${pub.muted}`}>No transactions yet.</p>
                    </PubCard>
                ) : (
                    tx.map((t) => (
                        <PubCard key={t.id} className="p-3.5">
                            <p className="text-xs text-white/90">{t.surveyTitle ? `${t.description} — ${t.surveyTitle}` : t.description}</p>
                            <div className="mt-1 flex items-center justify-between">
                                <span className={`text-[11px] ${pub.muted}`}>{new Date(t.createdAt).toLocaleString()}</span>
                                <span className="text-sm font-semibold text-emerald-400">+ {formatInrFull(t.amount)}</span>
                            </div>
                        </PubCard>
                    ))
                )}
            </div>

            <div className={`hidden md:block ${pub.tableWrap}`}>
                <table className="w-full text-left text-sm">
                    <thead className={pub.tableHead}>
                        <tr>
                            <th className={`${pub.tableCell} rounded-tl-2xl`}>Date</th>
                            <th className={pub.tableCell}>Description</th>
                            <th className={`${pub.tableCell} rounded-tr-2xl`}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tx.length === 0 ? (
                            <tr className={pub.tableRow}>
                                <td colSpan={3} className={`${pub.tableCell} ${pub.muted}`}>
                                    No transactions yet.
                                </td>
                            </tr>
                        ) : (
                            tx.map((t) => (
                                <tr key={t.id} className={pub.tableRow}>
                                    <td className={`${pub.tableCell} ${pub.muted}`}>{new Date(t.createdAt).toLocaleString()}</td>
                                    <td className={`${pub.tableCell} text-white/90`}>{t.surveyTitle ? `${t.description} — ${t.surveyTitle}` : t.description}</td>
                                    <td className={`${pub.tableCell} font-medium text-emerald-400`}>+ {formatInrFull(t.amount)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </PubPageFrame>
    );
}

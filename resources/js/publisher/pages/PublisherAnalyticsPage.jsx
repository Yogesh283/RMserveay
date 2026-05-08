import { useEffect, useState } from 'react';
import PubCard from '../components/PubCard';
import PubPageFrame from '../components/PubPageFrame';
import PubPageHeader from '../components/PubPageHeader';
import { publisherGet } from '../lib/publisherApi';
import { pub } from '../ui/pubTheme';

function formatDuration(sec) {
    if (sec == null || sec <= 0) {
        return '—';
    }
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
}

export default function PublisherAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [data, setData] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setErr(null);
            setLoading(true);
            try {
                const { data: d } = await publisherGet('publisher/analytics');
                if (!cancelled) {
                    setData(d);
                }
            } catch (e) {
                if (!cancelled) {
                    setErr(e.response?.data?.message ?? e.message ?? 'Could not load analytics');
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

    if (loading) {
        return (
            <PubPageFrame>
                <p className={`py-16 text-center text-sm ${pub.muted}`}>Loading analytics…</p>
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

    const topDrop = data?.dropOffByQuestion?.[0];

    return (
        <PubPageFrame>
            <PubPageHeader title="Analytics" subtitle="Aggregated from survey responses in your account." />

            <div className="grid gap-4 md:grid-cols-3">
                <PubCard className="p-5" hover>
                    <p className={`text-sm ${pub.muted}`}>Avg. completion</p>
                    <p className="mt-2 text-2xl font-bold text-white">{data?.completionRate ?? 0}%</p>
                    <p className={`mt-1 text-xs ${pub.muted}`}>Completed / all responses</p>
                </PubCard>
                <PubCard className="p-5" hover>
                    <p className={`text-sm ${pub.muted}`}>Drop-off focus</p>
                    <p className="mt-2 text-2xl font-bold text-white">{topDrop ? `${topDrop.count} @ ${topDrop.questionKey}` : '—'}</p>
                    <p className={`mt-1 text-xs ${pub.muted}`}>Most common drop-off question</p>
                </PubCard>
                <PubCard className="p-5" hover>
                    <p className={`text-sm ${pub.muted}`}>Avg. time (completed)</p>
                    <p className="mt-2 text-2xl font-bold text-white">{formatDuration(data?.medianTimeSec)}</p>
                    <p className={`mt-1 text-xs ${pub.muted}`}>Mean completion time</p>
                </PubCard>
            </div>

            <PubCard className="p-6">
                <p className="text-sm font-semibold text-white">Funnel</p>
                <p className={`mt-0.5 text-xs ${pub.muted}`}>Share of all recorded responses</p>
                <div className="mt-5 space-y-3">
                    {[
                        { l: 'Completed', w: data?.totalResponses ? Math.round(((data.completed ?? 0) / data.totalResponses) * 100) : 0 },
                        { l: 'Drop-off', w: data?.totalResponses ? Math.round(((data.dropped ?? 0) / data.totalResponses) * 100) : 0 },
                    ].map((s) => (
                        <div key={s.l}>
                            <div className="mb-1 flex justify-between text-xs">
                                <span className={pub.muted}>{s.l}</span>
                                <span className="text-white/90">{s.w}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[#1A2235]">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#6C4CF1] to-[#8E6BFF] shadow-[0_0_12px_rgba(124,92,255,0.35)] transition-all duration-500"
                                    style={{ width: `${s.w}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </PubCard>

            <PubCard className="border-[#7C5CFF]/25 p-6">
                <p className="text-sm font-semibold text-white">Responses by survey (title)</p>
                <ul className={`mt-3 space-y-2 text-sm ${pub.muted}`}>
                    {(data?.surveys ?? []).length ? (
                        data.surveys.map((s, i) => (
                            <li key={i} className="flex justify-between text-white/90">
                                <span>{s.title}</span>
                                <span>{s.response_count}</span>
                            </li>
                        ))
                    ) : (
                        <li>No surveys yet.</li>
                    )}
                </ul>
            </PubCard>
        </PubPageFrame>
    );
}

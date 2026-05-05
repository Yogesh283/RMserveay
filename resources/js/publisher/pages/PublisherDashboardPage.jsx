import { useEffect, useState } from 'react';
import PubButton from '../components/PubButton';
import PubCard from '../components/PubCard';
import PubPageHeader from '../components/PubPageHeader';
import { formatCompact, formatInr, publisherGet } from '../lib/publisherApi';
import { pub } from '../ui/pubTheme';

const gradFrom = '#6C4CF1';

function StatCard({ label, value, sub }) {
    return (
        <PubCard className="p-5" hover>
            <p className={`text-sm font-medium ${pub.muted}`}>{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
            {sub ? <p className="mt-1 text-xs font-medium text-emerald-400/90">{sub}</p> : null}
        </PubCard>
    );
}

function LineChartMini({ series }) {
    const pts =
        series.length > 0
            ? series
                  .map((p, i) => {
                      const x = (i / Math.max(series.length - 1, 1)) * 360;
                      const max = Math.max(...series.map((s) => s.responses), 1);
                      const y = 90 - (p.responses / max) * 70;
                      return `${x},${y}`;
                  })
                  .join(' ')
            : '0,80 360,80';
    return (
        <PubCard className="p-5">
            <p className="text-sm font-semibold text-white">Survey performance</p>
            <p className={`mt-0.5 text-xs ${pub.muted}`}>Responses per day (last 14 days)</p>
            <svg viewBox="0 0 360 100" className="mt-4 h-32 w-full" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="pub-dash-lg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={gradFrom} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={gradFrom} stopOpacity="0" />
                    </linearGradient>
                </defs>
                {series.length > 0 ? (
                    <>
                        <path d={`M ${pts.replace(/ /g, ' L ')} L 360,100 L 0,100 Z`} fill="url(#pub-dash-lg)" />
                        <polyline fill="none" stroke={gradFrom} strokeWidth="2.5" points={pts} />
                    </>
                ) : (
                    <text x="180" y="55" textAnchor="middle" className="fill-[#9CA3AF] text-xs">
                        No response data yet
                    </text>
                )}
            </svg>
        </PubCard>
    );
}

function BarChartMini({ items }) {
    const h = items.length ? items.map((it) => Math.min(95, 25 + (it.responses / Math.max(...items.map((i) => i.responses), 1)) * 70)) : [];
    return (
        <PubCard className="p-5">
            <p className="text-sm font-semibold text-white">Responses per survey</p>
            <p className={`mt-0.5 text-xs ${pub.muted}`}>Your campaigns</p>
            <div className="mt-4 flex h-32 items-end justify-between gap-1 px-1">
                {h.length ? (
                    h.map((height, i) => (
                        <div
                            key={i}
                            className="w-full max-w-[14%] rounded-t-md transition duration-200 hover:brightness-110"
                            style={{
                                height: `${height}%`,
                                background: `linear-gradient(180deg, ${gradFrom}, #8E6BFF)`,
                                opacity: 0.75 - i * 0.04,
                            }}
                            title={items[i]?.name}
                        />
                    ))
                ) : (
                    <p className={`w-full py-8 text-center text-xs ${pub.muted}`}>Create a survey to see bars</p>
                )}
            </div>
        </PubCard>
    );
}

function PieMini({ completed, dropped }) {
    const total = completed + dropped;
    const completeDeg = total > 0 ? (completed / total) * 360 : 252;
    const dropDeg = total > 0 ? (dropped / total) * 360 : 108;
    const c1 = completeDeg;
    const c2 = completeDeg + dropDeg;
    return (
        <PubCard className="p-5">
            <p className="text-sm font-semibold text-white">Completion rate</p>
            <p className={`mt-0.5 text-xs ${pub.muted}`}>All responses</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
                <div
                    className="h-28 w-28 shrink-0 rounded-full shadow-[0_0_32px_rgba(124,92,255,0.25)]"
                    style={{
                        background:
                            total > 0
                                ? `conic-gradient(${gradFrom} 0 ${c1}deg, #F87171 ${c1}deg ${c2}deg, #2A3550 ${c2}deg 360deg)`
                                : '#2A3550',
                    }}
                />
                <ul className={`space-y-2 text-xs ${pub.muted}`}>
                    <li className="flex items-center gap-2 text-white/90">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: gradFrom }} />
                        Complete {total > 0 ? Math.round((completed / total) * 100) : 0}%
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-400" /> Drop-off {total > 0 ? Math.round((dropped / total) * 100) : 0}%
                    </li>
                </ul>
            </div>
        </PubCard>
    );
}

function relTime(iso) {
    if (!iso) {
        return '';
    }
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) {
        return 'Just now';
    }
    if (m < 60) {
        return `${m} min ago`;
    }
    const h = Math.floor(m / 60);
    if (h < 48) {
        return `${h} hr ago`;
    }
    return d.toLocaleDateString();
}

export default function PublisherDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [stats, setStats] = useState(null);
    const [performance, setPerformance] = useState([]);
    const [bySurvey, setBySurvey] = useState([]);
    const [completion, setCompletion] = useState({ completed: 0, dropped: 0 });
    const [activity, setActivity] = useState([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setErr(null);
            setLoading(true);
            try {
                const [a, b, c, d, e] = await Promise.all([
                    publisherGet('publisher/dashboard'),
                    publisherGet('publisher/dashboard/performance'),
                    publisherGet('publisher/dashboard/by-survey'),
                    publisherGet('publisher/dashboard/completion'),
                    publisherGet('publisher/dashboard/activity'),
                ]);
                if (cancelled) {
                    return;
                }
                setStats(a.data.stats);
                setPerformance(b.data.series ?? []);
                setBySurvey(c.data.items ?? []);
                setCompletion(d.data ?? { completed: 0, dropped: 0 });
                setActivity(e.data.activity ?? []);
            } catch (e2) {
                if (!cancelled) {
                    setErr(e2.response?.data?.message ?? e2.message ?? 'Could not load dashboard');
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
            <div className={`py-16 text-center text-sm ${pub.muted}`}>
                Loading dashboard…
            </div>
        );
    }

    if (err) {
        return (
            <PubCard className="border-red-500/30 p-6">
                <p className="text-red-400">{err}</p>
            </PubCard>
        );
    }

    const monthHint =
        stats?.surveysThisMonth != null && stats.surveysThisMonth > 0 ? `+${stats.surveysThisMonth} this month` : null;

    return (
        <div className="space-y-8">
            <PubPageHeader
                title="Dashboard"
                subtitle="RM Survey Publisher — live stats from your database."
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total surveys" value={String(stats?.totalSurveys ?? 0)} sub={monthHint} />
                <StatCard label="Active surveys" value={String(stats?.activeSurveys ?? 0)} sub="Status = active" />
                <StatCard label="Total responses" value={formatCompact(stats?.totalResponses ?? 0)} sub="All time" />
                <StatCard label="Total earnings" value={formatInr(stats?.totalEarnings ?? 0)} sub="From survey responses" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <LineChartMini series={performance} />
                </div>
                <BarChartMini items={bySurvey.slice(0, 7)} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <PieMini completed={completion.completed} dropped={completion.dropped} />
                <PubCard className="p-5">
                    <p className="text-sm font-semibold text-white">Recent activity</p>
                    <ul className="mt-4 space-y-4">
                        {activity.length ? (
                            activity.map((a) => (
                                <li key={a.id} className="flex gap-3 border-b border-[#2A3550] pb-4 last:border-0 last:pb-0">
                                    <span
                                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                            a.type === 'money' ? 'bg-emerald-400' : a.type === 'ok' ? 'bg-[#8E6BFF]' : 'bg-amber-400'
                                        }`}
                                    />
                                    <div>
                                        <p className="text-sm text-white/90">{a.text}</p>
                                        <p className={`mt-1 text-xs ${pub.muted}`}>{relTime(a.time)}</p>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className={`text-sm ${pub.muted}`}>No responses yet — share an active survey link.</li>
                        )}
                    </ul>
                </PubCard>
            </div>

            <PubCard className="border-dashed border-[#7C5CFF]/35 bg-[#6C4CF1]/[0.07] p-6">
                <p className="text-sm font-semibold text-white">AI survey suggestions</p>
                <p className={`mt-1 text-sm leading-relaxed ${pub.muted}`}>
                    Question wording and follow-up logic — coming soon.
                </p>
                <PubButton className="mt-4" type="button">
                    Explore suggestions
                </PubButton>
            </PubCard>
        </div>
    );
}

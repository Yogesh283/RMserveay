import { useEffect, useState } from 'react';
import PubCard from '../components/PubCard';
import PubPageFrame from '../components/PubPageFrame';
import PubPageHeader from '../components/PubPageHeader';
import { publisherGet } from '../lib/publisherApi';
import { pub } from '../ui/pubTheme';

function tone(n) {
    const t = (n.type || '').toLowerCase();
    if (t.includes('earning') || t.includes('complete') || t.includes('response')) {
        return 'green';
    }
    if (t.includes('withdraw')) {
        return 'amber';
    }
    return 'purple';
}

export default function PublisherNotificationsPage() {
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [items, setItems] = useState([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setErr(null);
            setLoading(true);
            try {
                const { data } = await publisherGet('publisher/notifications');
                if (!cancelled) {
                    setItems(data.notifications ?? []);
                }
            } catch (e) {
                if (!cancelled) {
                    setErr(e.response?.data?.message ?? e.message ?? 'Could not load notifications');
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
                <p className={`py-16 text-center text-sm ${pub.muted}`}>Loading…</p>
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
            <PubPageHeader title="Notifications" subtitle="Stored notifications for your publisher account." />
            <ul className="space-y-3">
                {items.length === 0 ? (
                    <PubCard className="p-6">
                        <p className={`text-sm ${pub.muted}`}>No notifications yet — they appear when you get responses or earnings.</p>
                    </PubCard>
                ) : (
                    items.map((a) => {
                        const t = tone(a);
                        return (
                            <li key={a.id}>
                                <PubCard className="p-4" hover>
                                    <div className="flex items-start gap-3">
                                        <span
                                            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_10px_rgba(124,92,255,0.5)] ${
                                                t === 'green' ? 'bg-emerald-400' : t === 'amber' ? 'bg-amber-400' : 'bg-gradient-to-br from-[#6C4CF1] to-[#8E6BFF]'
                                            }`}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-white">{a.title}</p>
                                            {a.body ? <p className={`mt-1 text-sm ${pub.muted}`}>{a.body}</p> : null}
                                            <p className={`mt-2 text-xs ${pub.muted}`}>{new Date(a.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </PubCard>
                            </li>
                        );
                    })
                )}
            </ul>
        </PubPageFrame>
    );
}

import { useCallback, useEffect, useState } from 'react';
import PubCard from '../components/PubCard';
import PubPageFrame from '../components/PubPageFrame';
import PubPageHeader from '../components/PubPageHeader';
import PubSelect from '../components/PubSelect';
import { publisherGet } from '../lib/publisherApi';
import { pub } from '../ui/pubTheme';

export default function PublisherAudiencePage() {
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [users, setUsers] = useState([]);
    const [metrics, setMetrics] = useState({ total: 0, engaged: 0, engagementRate: 0 });
    const [gender, setGender] = useState('');
    const [location, setLocation] = useState('');

    const load = useCallback(async () => {
        setErr(null);
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (gender) {
                params.set('gender', gender);
            }
            if (location.trim()) {
                params.set('location', location.trim());
            }
            const q = params.toString();
            const { data } = await publisherGet(`publisher/audience${q ? `?${q}` : ''}`);
            setUsers(data.users ?? []);
            setMetrics(data.metrics ?? { total: 0, engaged: 0, engagementRate: 0 });
        } catch (e) {
            setErr(e.response?.data?.message ?? e.message ?? 'Could not load audience');
        } finally {
            setLoading(false);
        }
    }, [gender, location]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <PubPageFrame>
            <PubPageHeader
                title="Audience / Users"
                subtitle={`${metrics.total} responses in view · ${metrics.engagementRate}% completed`}
            />

            {err ? (
                <PubCard className="border-red-500/30 p-4">
                    <p className="text-sm text-red-400">{err}</p>
                </PubCard>
            ) : null}

            <PubCard className="p-3.5 sm:p-4">
                <div className="grid gap-2.5 sm:grid-cols-[auto_1fr_auto] sm:items-end">
                    <PubSelect label="Gender" className="min-w-0 w-full sm:min-w-[140px]" value={gender} onChange={(e) => setGender(e.target.value)}>
                        <option value="">All genders</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </PubSelect>
                    <label className="block min-w-0">
                        <span className={pub.label}>Location</span>
                        <input
                            type="text"
                            placeholder="Contains…"
                            className={`${pub.input} w-full`}
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                        />
                    </label>
                    <button
                        type="button"
                        onClick={load}
                        className="h-[42px] shrink-0 rounded-xl bg-gradient-to-r from-[#6C4CF1] to-[#8E6BFF] px-4 text-sm font-semibold text-white shadow-[0_0_18px_rgba(124,92,255,0.3)]"
                    >
                        Filter
                    </button>
                </div>
            </PubCard>

            {loading ? (
                <p className={`text-sm ${pub.muted}`}>Loading…</p>
            ) : (
                <>
                <div className="space-y-2 md:hidden">
                    {users.length === 0 ? (
                        <PubCard className="p-4">
                            <p className={`text-sm ${pub.muted}`}>No responses match filters.</p>
                        </PubCard>
                    ) : (
                        users.map((u) => (
                            <PubCard key={u.id} className="p-3.5">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-semibold text-white">{u.name}</p>
                                    <span className={`text-xs font-medium ${u.engaged ? 'text-emerald-400' : 'text-amber-400'}`}>{u.engaged ? 'Completed' : 'Partial'}</span>
                                </div>
                                <p className={`mt-1 text-xs ${pub.muted}`}>{u.survey}</p>
                                <p className={`mt-1 text-xs ${pub.muted}`}>{u.location}</p>
                                <p className={`mt-1 text-[11px] ${pub.muted}`}>{new Date(u.submittedAt).toLocaleString()}</p>
                            </PubCard>
                        ))
                    )}
                </div>
                <div className={`hidden md:block ${pub.tableWrap}`}>
                    <table className="w-full text-left text-sm">
                        <thead className={pub.tableHead}>
                            <tr>
                                <th className={`${pub.tableCell} rounded-tl-2xl`}>Respondent</th>
                                <th className={pub.tableCell}>Survey</th>
                                <th className={pub.tableCell}>Location</th>
                                <th className={pub.tableCell}>Engaged</th>
                                <th className={`${pub.tableCell} rounded-tr-2xl`}>Submitted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr className={pub.tableRow}>
                                    <td colSpan={5} className={`${pub.tableCell} ${pub.muted}`}>
                                        No responses match filters. Collect responses with respondent fields on submit.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.id} className={pub.tableRow}>
                                        <td className={`${pub.tableCell} font-medium text-white`}>{u.name}</td>
                                        <td className={`${pub.tableCell} ${pub.muted}`}>{u.survey}</td>
                                        <td className={`${pub.tableCell} ${pub.muted}`}>{u.location}</td>
                                        <td className={`${pub.tableCell} ${u.engaged ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {u.engaged ? 'Completed' : 'Partial'}
                                        </td>
                                        <td className={`${pub.tableCell} ${pub.muted}`}>{new Date(u.submittedAt).toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                </>
            )}
        </PubPageFrame>
    );
}

import { useCallback, useEffect, useState } from 'react';
import PubCard from '../components/PubCard';
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
        <div className="space-y-6">
            <PubPageHeader
                title="Audience / Users"
                subtitle={`${metrics.total} responses in view · ${metrics.engagementRate}% completed`}
            />

            {err ? (
                <PubCard className="border-red-500/30 p-4">
                    <p className="text-sm text-red-400">{err}</p>
                </PubCard>
            ) : null}

            <PubCard className="flex flex-wrap gap-3 p-4">
                <PubSelect className="min-w-[140px]" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">All genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                </PubSelect>
                <input
                    type="text"
                    placeholder="Location contains…"
                    className={`${pub.input} max-w-xs`}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                />
            </PubCard>

            {loading ? (
                <p className={`text-sm ${pub.muted}`}>Loading…</p>
            ) : (
                <div className={pub.tableWrap}>
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
            )}
        </div>
    );
}

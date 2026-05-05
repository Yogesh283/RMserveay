import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PubCard from '../components/PubCard';
import PubPageHeader from '../components/PubPageHeader';
import PubSelect from '../components/PubSelect';
import { formatInrFull, publisherDelete, publisherGet } from '../lib/publisherApi';
import { pub } from '../ui/pubTheme';

export default function PublisherSurveysPage() {
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [rows, setRows] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [from, setFrom] = useState('');

    const load = useCallback(async () => {
        setErr(null);
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) {
                params.set('status', statusFilter);
            }
            if (from) {
                params.set('from', from);
            }
            const q = params.toString();
            const { data } = await publisherGet(`publisher/surveys${q ? `?${q}` : ''}`);
            setRows(data.surveys ?? []);
        } catch (e) {
            setErr(e.response?.data?.message ?? e.message ?? 'Could not load surveys');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, from]);

    useEffect(() => {
        load();
    }, [load]);

    async function onDelete(id, title) {
        if (!window.confirm(`Delete survey “${title}”?`)) {
            return;
        }
        try {
            await publisherDelete(`publisher/surveys/${id}`);
            await load();
        } catch (e) {
            setErr(e.response?.data?.message ?? e.message ?? 'Delete failed');
        }
    }

    return (
        <div className="space-y-6">
            <PubPageHeader
                title="Surveys"
                subtitle="Live list from the database — filter by status or date."
                actions={
                    <Link to="/publisher/create" className={pub.btnPrimary}>
                        Create survey
                    </Link>
                }
            />

            {err ? (
                <PubCard className="border-red-500/30 p-4">
                    <p className="text-sm text-red-400">{err}</p>
                </PubCard>
            ) : null}

            <PubCard className="flex flex-wrap gap-3 p-4">
                <input type="date" className={`${pub.input} w-auto max-w-[11rem]`} value={from} onChange={(e) => setFrom(e.target.value)} />
                <PubSelect className="min-w-[140px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                </PubSelect>
            </PubCard>

            {loading ? (
                <p className={`text-sm ${pub.muted}`}>Loading…</p>
            ) : (
                <div className={pub.tableWrap}>
                    <table className="w-full text-left text-sm">
                        <thead className={pub.tableHead}>
                            <tr>
                                <th className={`${pub.tableCell} rounded-tl-2xl`}>Survey name</th>
                                <th className={pub.tableCell}>Status</th>
                                <th className={pub.tableCell}>Responses</th>
                                <th className={pub.tableCell}>Earnings</th>
                                <th className={`${pub.tableCell} rounded-tr-2xl`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr className={pub.tableRow}>
                                    <td colSpan={5} className={`${pub.tableCell} ${pub.muted}`}>
                                        No surveys yet. Create one to get started.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r) => (
                                    <tr key={r.id} className={pub.tableRow}>
                                        <td className={`${pub.tableCell} font-medium text-white`}>{r.title}</td>
                                        <td className={pub.tableCell}>
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    r.status === 'active'
                                                        ? 'bg-emerald-500/15 text-emerald-400'
                                                        : r.status === 'draft'
                                                          ? 'bg-amber-500/15 text-amber-300'
                                                          : 'bg-[#1A2235] text-[#9CA3AF]'
                                                }`}
                                            >
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className={`${pub.tableCell} text-[#9CA3AF]`}>{Number(r.responseCount ?? 0).toLocaleString()}</td>
                                        <td className={`${pub.tableCell} font-medium text-emerald-400`}>
                                            {formatInrFull(r.earningsTotalUsd ?? 0)}
                                        </td>
                                        <td className={`${pub.tableCell}`}>
                                            <button type="button" className="text-red-400 transition hover:text-red-300" onClick={() => onDelete(r.id, r.title)}>
                                                Delete
                                            </button>
                                        </td>
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

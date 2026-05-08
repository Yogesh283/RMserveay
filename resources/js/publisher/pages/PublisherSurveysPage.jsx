import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PubCard from '../components/PubCard';
import PubPageFrame from '../components/PubPageFrame';
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
        <PubPageFrame>
            <PubCard className="relative overflow-hidden p-4 sm:p-5">
                <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[#8E6BFF]/25 blur-2xl" />
                <div className="pointer-events-none absolute left-0 top-0 h-12 w-12 rounded-full bg-cyan-400/10 blur-xl" />
                <div className="relative flex items-start justify-between gap-3">
                    <div>
                        <h1 className="bg-gradient-to-r from-white via-violet-100 to-[#C4B5FD] bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                            Surveys
                        </h1>
                        <p className={`mt-1 text-sm ${pub.muted}`}>Manage and monitor all your surveys</p>
                    </div>
                    <Link
                        to="/publisher/create"
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C4CF1] to-[#8E6BFF] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(124,92,255,0.38)]"
                    >
                        <span className="text-base leading-none">+</span>
                        Create Survey
                    </Link>
                </div>
            </PubCard>

            {err ? (
                <PubCard className="border-red-500/30 p-4">
                    <p className="text-sm text-red-400">{err}</p>
                </PubCard>
            ) : null}

            <PubCard className="p-3.5 sm:p-4">
                <div className="grid gap-2.5 sm:grid-cols-[auto_auto_auto] sm:items-end">
                    <label className="block">
                        <span className={pub.label}>Date</span>
                        <input type="date" className={`${pub.input} w-full sm:w-[11.5rem]`} value={from} onChange={(e) => setFrom(e.target.value)} />
                    </label>
                    <PubSelect label="Status" className="min-w-[140px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">All status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="draft">Pending</option>
                    </PubSelect>
                    <button
                        type="button"
                        onClick={load}
                        className="h-[42px] rounded-xl bg-gradient-to-r from-[#6C4CF1] to-[#8E6BFF] px-4 text-sm font-semibold text-white shadow-[0_0_18px_rgba(124,92,255,0.3)]"
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
                    {rows.length === 0 ? (
                        <PubCard className="p-5 text-center">
                            <p className="text-sm font-semibold text-white">No surveys available yet</p>
                            <p className={`mt-1 text-xs ${pub.muted}`}>Create your first survey to get started</p>
                            <Link to="/publisher/create" className="mt-3 inline-flex items-center rounded-lg bg-gradient-to-r from-[#6C4CF1] to-[#8E6BFF] px-3 py-1.5 text-xs font-semibold text-white">
                                Create Now
                            </Link>
                        </PubCard>
                    ) : (
                        rows.map((r) => (
                            <PubCard key={r.id} className="p-3.5">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-semibold text-white">{r.title}</p>
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                        r.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : r.status === 'draft' ? 'bg-amber-500/15 text-amber-300' : 'bg-[#1A2235] text-[#9CA3AF]'
                                    }`}>
                                        {r.status === 'draft' ? 'Pending' : r.status}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-xs">
                                    <span className={pub.muted}>Responses: {Number(r.responseCount ?? 0).toLocaleString()}</span>
                                    <span className="font-semibold text-emerald-400">{formatInrFull(r.earningsTotalUsd ?? 0)}</span>
                                </div>
                                <button type="button" className="mt-2 rounded-lg border border-red-500/30 px-2.5 py-1 text-xs font-medium text-red-400" onClick={() => onDelete(r.id, r.title)}>
                                    Delete
                                </button>
                            </PubCard>
                        ))
                    )}
                </div>
                <div className={`hidden md:block ${pub.tableWrap}`}>
                    <table className="w-full text-left text-sm">
                        <thead className={pub.tableHead}>
                            <tr>
                                <th className={`${pub.tableCell} rounded-tl-2xl`}>Survey Name</th>
                                <th className={pub.tableCell}>Status</th>
                                <th className={pub.tableCell}>Responses</th>
                                <th className={pub.tableCell}>Earnings</th>
                                <th className={`${pub.tableCell} rounded-tr-2xl`}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr className={pub.tableRow}>
                                    <td colSpan={5} className={`${pub.tableCell} py-10`}>
                                        <div className="mx-auto max-w-sm text-center">
                                            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#8E6BFF]/35 bg-[#8E6BFF]/10 text-[#C4B5FD] shadow-[0_0_20px_rgba(124,92,255,0.28)]">
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-semibold text-white">No surveys available yet</p>
                                            <p className={`mt-1 text-xs ${pub.muted}`}>Create your first survey to get started</p>
                                            <Link
                                                to="/publisher/create"
                                                className="mt-3 inline-flex items-center rounded-lg bg-gradient-to-r from-[#6C4CF1] to-[#8E6BFF] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_14px_rgba(124,92,255,0.3)]"
                                            >
                                                Create Now
                                            </Link>
                                        </div>
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
                                                {r.status === 'draft' ? 'Pending' : r.status}
                                            </span>
                                        </td>
                                        <td className={`${pub.tableCell} text-[#9CA3AF]`}>{Number(r.responseCount ?? 0).toLocaleString()}</td>
                                        <td className={`${pub.tableCell} font-medium text-emerald-400`}>{formatInrFull(r.earningsTotalUsd ?? 0)}</td>
                                        <td className={pub.tableCell}>
                                            <button type="button" className="rounded-lg border border-red-500/30 px-2.5 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/10" onClick={() => onDelete(r.id, r.title)}>
                                                Delete
                                            </button>
                                        </td>
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

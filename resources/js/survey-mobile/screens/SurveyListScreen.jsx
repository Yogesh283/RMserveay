import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, ScreenTitle, SearchInput } from '../components/ui';

const MOCK = [
    { id: '1', title: 'Premium tech attitudes', reward: 85, time: '6 min', responses: '2.1k', tag: 'high' },
    { id: '2', title: 'Snack preferences 2025', reward: 40, time: '4 min', responses: '890', tag: 'popular' },
    { id: '3', title: 'EV charging habits', reward: 120, time: '9 min', responses: '540', tag: 'high' },
    { id: '4', title: 'Streaming satisfaction', reward: 55, time: '5 min', responses: '3.4k', tag: 'popular' },
    { id: '5', title: 'Insurance literacy pulse', reward: 35, time: '3 min', responses: '410', tag: 'new' },
];

function tagStyle(tag) {
    if (tag === 'high') return 'border-amber-500/35 bg-amber-500/12 text-amber-200 ring-amber-500/25';
    if (tag === 'popular') return 'border-blue-500/35 bg-blue-500/12 text-blue-200 ring-blue-500/25';
    if (tag === 'new') return 'border-emerald-500/35 bg-emerald-500/12 text-emerald-200 ring-emerald-500/25';
    return '';
}

function tagLabel(tag) {
    if (tag === 'high') return 'High paying';
    if (tag === 'popular') return 'Popular';
    if (tag === 'new') return 'New';
    return '';
}

export default function SurveyListScreen() {
    const [q, setQ] = useState('');
    const [tab, setTab] = useState('all');

    const filtered = useMemo(() => {
        let rows = MOCK.filter((m) => m.title.toLowerCase().includes(q.toLowerCase()));
        if (tab === 'high') rows = rows.filter((m) => m.tag === 'high');
        if (tab === 'popular') rows = rows.filter((m) => m.tag === 'popular');
        if (tab === 'new') rows = rows.filter((m) => m.tag === 'new');
        return rows;
    }, [q, tab]);

    const tabs = [
        { id: 'all', label: 'All' },
        { id: 'high', label: 'High paying' },
        { id: 'popular', label: 'Popular' },
        { id: 'new', label: 'New' },
    ];

    return (
        <div className="relative min-h-screen px-4 pb-10 pt-12">
            <ScreenTitle eyebrow="Marketplace" title="All surveys" subtitle="Filter, search, earn — transparent rewards." />

            <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search surveys…" />

            <div className="mt-4 flex gap-1.5 overflow-x-auto rounded-[20px] border border-white/[0.08] bg-[rgba(11,15,26,0.65)] p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={`shrink-0 rounded-[14px] px-3.5 py-2.5 text-xs font-semibold transition ${
                            tab === t.id
                                ? 'bg-gradient-to-r from-[#7C3AED]/50 to-[#3B82F6]/35 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] ring-1 ring-amber-400/30'
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="mt-5 space-y-3">
                {filtered.map((s) => (
                    <Link key={s.id} to={`/survey/surveys/${s.id}`}>
                        <Card variant="elevated" className="p-4 transition hover:border-[#7C3AED]/35 hover:shadow-[0_0_28px_rgba(124,58,237,0.15)]">
                            <div className="flex items-start gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#7C3AED]/25 to-[#3B82F6]/15 ring-1 ring-white/10">
                                    <svg className="h-5 w-5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-white">{s.title}</p>
                                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                        <span className="inline-flex items-center gap-1">
                                            <span className="text-slate-600">⏱</span> {s.time}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <span className="text-slate-600">◎</span> {s.responses}
                                        </span>
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-lg font-bold text-amber-300">₹{s.reward}</p>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-600">reward</p>
                                </div>
                            </div>
                            {s.tag ? (
                                <span className={`mt-3 inline-block rounded-[10px] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ${tagStyle(s.tag)}`}>
                                    {tagLabel(s.tag)}
                                </span>
                            ) : null}
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}

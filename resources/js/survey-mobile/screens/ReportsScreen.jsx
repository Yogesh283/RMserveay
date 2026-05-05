import { useState } from 'react';
import { GlassCard } from '../components/ui';

const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'responses', label: 'Responses' },
    { id: 'insights', label: 'Insights' },
];

export default function ReportsScreen() {
    const [tab, setTab] = useState('overview');

    return (
        <div className="min-h-screen px-4 pb-8 pt-14">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-white">Reports</h1>
                <p className="mt-1 text-sm text-slate-400">Campaign performance</p>
            </header>

            <div className="flex gap-1 rounded-[20px] border border-white/[0.08] bg-[rgba(11,15,26,0.7)] p-1.5">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={`flex-1 rounded-[14px] py-2.5 text-xs font-semibold transition ${
                            tab === t.id
                                ? 'bg-gradient-to-r from-[#7C3AED]/45 to-[#3B82F6]/30 text-white shadow-[0_0_24px_rgba(124,58,237,0.3)] ring-1 ring-amber-400/25'
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-2">
                {[
                    { label: 'Responses', value: '3,248', delta: '+12%' },
                    { label: 'Avg time', value: '2m 04s', delta: '' },
                    { label: 'Completion', value: '68%', delta: '+4%' },
                ].map((m) => (
                    <GlassCard key={m.label} className="p-3 text-center">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{m.label}</p>
                        <p className="mt-1.5 text-lg font-bold text-white">{m.value}</p>
                        {m.delta ? <p className="mt-0.5 text-[10px] font-medium text-emerald-400">{m.delta}</p> : null}
                    </GlassCard>
                ))}
            </div>

            {/* Line chart */}
            <GlassCard className="mt-6 p-5">
                <p className="text-sm font-semibold text-white">Responses over time</p>
                <p className="mt-0.5 text-xs text-slate-500">Last 14 days</p>
                <div className="mt-6 h-36">
                    <svg viewBox="0 0 320 120" className="h-full w-full" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#7C3AED" />
                                <stop offset="100%" stopColor="#3B82F6" />
                            </linearGradient>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.22" />
                                <stop offset="100%" stopColor="#0B0F1A" stopOpacity="0" />
                            </linearGradient>
                            <filter id="chartGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="2" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        <path
                            d="M0,90 Q40,85 80,70 T160,50 T240,35 T320,20 L320,120 L0,120 Z"
                            fill="url(#areaGrad)"
                        />
                        <path
                            d="M0,90 Q40,85 80,70 T160,50 T240,35 T320,20"
                            fill="none"
                            stroke="url(#lineGrad)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            filter="url(#chartGlow)"
                        />
                    </svg>
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-slate-600">
                    <span>Week 1</span>
                    <span>Week 2</span>
                    <span>Now</span>
                </div>
            </GlassCard>

            {/* Donut */}
            <GlassCard className="mt-6 p-5">
                <p className="text-sm font-semibold text-white">Feedback summary</p>
                <div className="mt-6 flex items-center justify-center gap-8">
                    <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0">
                        <defs>
                            <linearGradient id="d1" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#7C3AED" />
                                <stop offset="100%" stopColor="#3B82F6" />
                            </linearGradient>
                        </defs>
                        <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
                        <circle
                            cx="60"
                            cy="60"
                            r="48"
                            fill="none"
                            stroke="url(#d1)"
                            strokeWidth="16"
                            strokeDasharray="201 302"
                            strokeLinecap="round"
                            transform="rotate(-90 60 60)"
                            className="drop-shadow-[0_0_14px_rgba(124,58,237,0.45)]"
                        />
                        <circle
                            cx="60"
                            cy="60"
                            r="48"
                            fill="none"
                            stroke="rgba(59,130,246,0.95)"
                            strokeWidth="16"
                            strokeDasharray="80 302"
                            strokeDashoffset="-201"
                            strokeLinecap="round"
                            transform="rotate(-90 60 60)"
                        />
                        <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(245,158,11,0.95)" strokeWidth="16" strokeDasharray="40 302" strokeDashoffset="-281" strokeLinecap="round" transform="rotate(-90 60 60)" />
                    </svg>
                    <ul className="space-y-2 text-xs">
                        <li className="flex items-center gap-2 text-slate-300">
                            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6]" /> Positive 62%
                        </li>
                        <li className="flex items-center gap-2 text-slate-300">
                            <span className="h-2 w-2 rounded-full bg-[#3B82F6]" /> Neutral 25%
                        </li>
                        <li className="flex items-center gap-2 text-slate-300">
                            <span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> Negative 13%
                        </li>
                    </ul>
                </div>
            </GlassCard>

            {tab !== 'overview' ? (
                <p className="mt-6 text-center text-sm text-slate-500">
                    {tab === 'responses' ? 'Raw exports & filters — coming in production.' : 'AI summaries — coming soon.'}
                </p>
            ) : null}
        </div>
    );
}

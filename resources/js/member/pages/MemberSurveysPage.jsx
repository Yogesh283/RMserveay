import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { prepareSanctum } from '../../lib/auth';
import { RmsCard } from '../components/rms';
import { isSurveyProfileComplete, profileGateRedirectPath } from '../lib/surveyProfileGate';

function fmtUsd(n) {
    const x = Number.parseFloat(String(n));
    if (Number.isNaN(x)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(x);
}

/** Table style: `2026-04-30 08:56 AM` */
function fmtCompletedTableDate(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        const datePart = d.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${datePart} ${timePart}`;
    } catch {
        return '—';
    }
}

const TIER_ORDER = ['free', 'panel', 'sub_panel', 'super_panel'];

const TIER_SECTIONS = {
    free: {
        title: 'Free Survey',
        subtitle: 'Start instantly and earn from beginner surveys.',
        titleClass: 'text-white',
        cardBorder:
            'border-emerald-500/30 bg-gradient-to-br from-emerald-950/35 via-[#0f172a] to-[#111827] ring-1 ring-emerald-500/20 shadow-[0_0_36px_rgba(16,185,129,0.08)]',
        accentStrip: 'mb-2 h-0.5 rounded-full bg-gradient-to-r from-emerald-600/90 via-teal-400/70 to-emerald-500/90',
        chip: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/25',
        iconBg: 'from-emerald-400/30 to-emerald-950/50 ring-emerald-400/35',
        iconStroke: 'text-emerald-200',
        rewardText: 'text-emerald-300',
        ctaEligible: 'border-emerald-400/45 bg-emerald-500/18 text-emerald-50 ring-1 ring-emerald-400/35',
        doneIconBg: 'from-emerald-500/35 to-[#111827] ring-emerald-400/35',
        doneReward: 'text-emerald-300',
    },
    panel: {
        title: 'Panel Survey',
        subtitle: 'Team-oriented surveys with higher payouts.',
        titleClass:
            'bg-gradient-to-r from-sky-200 via-cyan-200 to-sky-300 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(34,211,238,0.25)]',
        cardBorder:
            'border-cyan-400/35 bg-gradient-to-br from-sky-950/55 via-[#0a1628] to-[#111827] ring-1 ring-cyan-400/25 shadow-[0_0_42px_rgba(34,211,238,0.14)]',
        accentStrip: 'mb-2 h-0.5 rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-500',
        chip: 'border-cyan-400/45 bg-gradient-to-r from-sky-500/25 to-cyan-600/20 text-cyan-50 ring-1 ring-cyan-400/35',
        iconBg: 'from-sky-400/40 to-cyan-950/45 ring-cyan-400/45 shadow-[0_0_16px_rgba(56,189,248,0.2)]',
        iconStroke: 'text-cyan-200',
        rewardText: 'text-cyan-200',
        ctaEligible: 'border-cyan-400/50 bg-cyan-500/15 text-cyan-50 ring-1 ring-cyan-400/40',
        doneIconBg: 'from-sky-500/35 to-cyan-950/40 ring-cyan-400/40',
        doneReward: 'text-cyan-300',
    },
    sub_panel: {
        title: 'Sub panel Survey',
        subtitle: 'Advanced survey tracks for active members.',
        titleClass:
            'bg-gradient-to-r from-violet-200 via-fuchsia-200 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(192,132,252,0.25)]',
        cardBorder:
            'border-fuchsia-400/35 bg-gradient-to-br from-violet-950/50 via-[#14081c] to-[#111827] ring-1 ring-fuchsia-500/25 shadow-[0_0_42px_rgba(217,70,239,0.14)]',
        accentStrip: 'mb-2 h-0.5 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-purple-600',
        chip: 'border-fuchsia-400/45 bg-gradient-to-r from-violet-600/25 to-fuchsia-600/20 text-fuchsia-50 ring-1 ring-fuchsia-400/35',
        iconBg: 'from-fuchsia-500/40 to-violet-950/50 ring-fuchsia-400/45 shadow-[0_0_16px_rgba(192,132,252,0.22)]',
        iconStroke: 'text-fuchsia-200',
        rewardText: 'text-fuchsia-200',
        ctaEligible: 'border-fuchsia-400/50 bg-fuchsia-500/18 text-fuchsia-50 ring-1 ring-fuchsia-400/40',
        doneIconBg: 'from-fuchsia-500/35 to-violet-950/45 ring-fuchsia-400/40',
        doneReward: 'text-fuchsia-300',
    },
    super_panel: {
        title: 'Super panel Survey',
        subtitle: 'Premium-level surveys with elite rewards.',
        titleClass:
            'bg-gradient-to-r from-amber-200 via-orange-200 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(251,191,36,0.3)]',
        cardBorder:
            'border-amber-400/45 bg-gradient-to-br from-amber-950/55 via-[#1a1208] to-[#111827] ring-1 ring-amber-400/35 shadow-[0_0_48px_rgba(245,158,11,0.2)]',
        accentStrip: 'mb-2 h-0.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600',
        chip: 'border-amber-400/50 bg-gradient-to-r from-amber-600/30 to-orange-600/25 text-amber-50 ring-1 ring-amber-400/40',
        iconBg: 'from-amber-400/45 to-orange-950/40 ring-amber-400/50 shadow-[0_0_18px_rgba(251,191,36,0.22)]',
        iconStroke: 'text-amber-200',
        rewardText: 'text-amber-200',
        ctaEligible: 'border-amber-400/55 bg-amber-500/22 text-amber-50 ring-1 ring-amber-400/45',
        doneIconBg: 'from-amber-500/40 to-orange-950/35 ring-amber-400/45',
        doneReward: 'text-amber-300',
    },
};

function normalizeMemberTier(t) {
    const allowed = ['free', 'panel', 'sub_panel', 'super_panel'];
    const x = String(t || 'free').toLowerCase();
    return allowed.includes(x) ? x : 'free';
}

function groupByTier(rows, tierGetter) {
    const g = { free: [], panel: [], sub_panel: [], super_panel: [] };
    for (const row of rows) {
        const k = normalizeMemberTier(tierGetter(row));
        g[k].push(row);
    }
    return g;
}

function tierLockHint(tier) {
    switch (tier) {
        case 'panel':
            return 'Unlock: become an active panelist ($1 activation + $10 minimum panel).';
        case 'sub_panel':
            return 'Unlock: hold at least one sub panel.';
        case 'super_panel':
            return 'Unlock: hold at least one super panel.';
        default:
            return '';
    }
}

function SurveyIcon({ strokeClass = 'text-[#C4B5FD]' }) {
    return (
        <svg className={`h-4 w-4 ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
        </svg>
    );
}

function AvailableSurveyRow({ s, tier }) {
    const eligible = s.eligible !== false;
    const meta = TIER_SECTIONS[tier];
    const inner = (
        <RmsCard variant="elevated" className="!p-0 transition active:scale-[0.99]" padding={false}>
            <div className="flex items-start gap-2 p-2.5">
                <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.iconBg} ring-1`}
                >
                    <SurveyIcon strokeClass={meta.iconStroke} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-white">{s.title}</p>
                    {s.description ? <p className="mt-0.5 line-clamp-1 text-[11px] text-[#A0AEC0]">{s.description}</p> : null}
                    {!eligible ? (
                        <p className="mt-1 text-[10px] leading-snug text-amber-200/90">{tierLockHint(tier)}</p>
                    ) : null}
                </div>
                <div className="shrink-0 text-right">
                    <p className={`text-base font-bold tabular-nums leading-none ${meta.rewardText}`}>{fmtUsd(s.estimatedRewardUsd)}</p>
                    <p className="text-[8px] uppercase tracking-wider text-[#A0AEC0]">Est.</p>
                </div>
            </div>
            <div className="border-t border-white/5 px-2.5 py-1">
                {eligible ? (
                    <span
                        className={`inline-block rounded-lg border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${meta.ctaEligible}`}
                    >
                        Open
                    </span>
                ) : (
                    <span className="inline-block rounded-lg border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                        Locked
                    </span>
                )}
            </div>
        </RmsCard>
    );

    if (!eligible) {
        return <div className="pointer-events-none opacity-85">{inner}</div>;
    }

    return (
        <Link
            to={`/member/surveys/${s.id}/session`}
            className="block transition hover:opacity-[0.97]"
            aria-label={`Open survey: ${s.title}`}
        >
            {inner}
        </Link>
    );
}

const tierToggleBtn =
    'rounded-xl border border-[#8B5CF6]/40 bg-gradient-to-r from-[#7C3AED]/35 to-[#2563EB]/20 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_0_18px_rgba(124,58,237,0.25)] transition hover:brightness-110 active:scale-[0.98]';

function emptyTierOpenState() {
    return { free: false, panel: false, sub_panel: false, super_panel: false };
}

export default function MemberSurveysPage() {
    const [section, setSection] = useState('available');
    const [q, setQ] = useState('');
    const [available, setAvailable] = useState([]);
    const [completed, setCompleted] = useState([]);
    const [surveyIncomePayoutDelayDays, setSurveyIncomePayoutDelayDays] = useState(7);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [openAvailableTiers, setOpenAvailableTiers] = useState(emptyTierOpenState);
    const [profileChecked, setProfileChecked] = useState(false);
    const [profileComplete, setProfileComplete] = useState(true);

    const load = useCallback(async () => {
        setErr(null);
        setLoading(true);
        try {
            await prepareSanctum();
            const [u, a, c] = await Promise.all([
                window.axios.get('api/user'),
                window.axios.get('api/member/surveys/available'),
                window.axios.get('api/member/surveys/completed'),
            ]);
            setProfileComplete(isSurveyProfileComplete(u.data?.user ?? null));
            setAvailable(a.data.surveys ?? []);
            setCompleted(c.data.completed ?? []);
            setSurveyIncomePayoutDelayDays(Number(c.data.surveyIncomePayoutDelayDays) || 7);
        } catch (e) {
            setErr(e.response?.data?.message ?? e.message ?? 'Failed to load surveys');
        } finally {
            setProfileChecked(true);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const filteredAvailable = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return available;
        return available.filter((row) => (row.title || '').toLowerCase().includes(s));
    }, [available, q]);

    const filteredCompleted = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return completed;
        return completed.filter((row) => (row.title || '').toLowerCase().includes(s));
    }, [completed, q]);

    const groupedAvailable = useMemo(() => groupByTier(filteredAvailable, (r) => r.memberTier), [filteredAvailable]);

    const anyAvailable = filteredAvailable.length > 0;

    if (profileChecked && !profileComplete) {
        return <Navigate to={profileGateRedirectPath('/member/surveys')} replace />;
    }

    return (
        <div className="relative min-h-[40vh] space-y-3 pb-24">
            <div className="relative overflow-hidden rounded-[20px] border border-amber-300/35 bg-gradient-to-r from-amber-500/15 via-orange-500/12 to-rose-500/12 p-3 shadow-[0_10px_30px_rgba(251,191,36,0.18)] ring-1 ring-amber-300/25 backdrop-blur-xl sm:p-3.5">
                <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-400/25 blur-2xl" />
                <div className="pointer-events-none absolute -left-4 bottom-0 h-16 w-16 rounded-full bg-rose-400/20 blur-2xl" />
                <div className="relative flex items-start gap-2.5 sm:items-center sm:gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/45 bg-gradient-to-br from-amber-400/35 to-orange-500/30 text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.35)] sm:h-11 sm:w-11">
                        <svg className="h-5 w-5 sm:h-5.5 sm:w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center rounded-full border border-amber-300/45 bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-amber-100 sm:text-[10px]">
                                Weekly
                            </span>
                            <span className="inline-flex items-center rounded-full border border-rose-300/40 bg-rose-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-rose-100 sm:text-[10px]">
                                Every Tuesday
                            </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold leading-snug text-white sm:text-base">
                            New Survey Drops Every Tuesday
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-amber-100/85 sm:text-xs">
                            Stay tuned — fresh weekly surveys go live every Tuesday. Don't miss your earnings window.
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-gradient-to-br from-[#050816]/95 via-[#0B1120]/95 to-[#050816]/95 p-3 shadow-[0_20px_48px_rgba(0,0,0,0.45)]">
                <div className="flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/30 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                    type="button"
                    onClick={() => setSection('available')}
                    className={`shrink-0 flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition active:scale-[0.98] ${
                        section === 'available'
                            ? 'bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white shadow-[0_10px_26px_rgba(124,58,237,0.4)] ring-1 ring-[#A78BFA]/45'
                            : 'text-[#A0AEC0] hover:text-white'
                    }`}
                >
                    Available
                </button>
                <button
                    type="button"
                    onClick={() => setSection('completed')}
                    className={`shrink-0 flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition active:scale-[0.98] ${
                        section === 'completed'
                            ? 'bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white shadow-[0_10px_26px_rgba(124,58,237,0.4)] ring-1 ring-[#A78BFA]/45'
                            : 'text-[#A0AEC0] hover:text-white'
                    }`}
                >
                    Completed
                </button>
                </div>

                <div className="relative mt-4 overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-br from-[#11182c] to-[#0a1020] p-4">
                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#7C3AED]/25 blur-2xl" />
                    <div className="pointer-events-none absolute -left-6 bottom-0 h-16 w-16 rounded-full bg-cyan-400/15 blur-2xl" />
                    <div className="relative flex items-center gap-3">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#8B5CF6]/45 bg-[#7C3AED]/20 text-[#DDD6FE] shadow-[0_0_18px_rgba(124,58,237,0.35)]">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5h10M9 9h10M9 13h10M5 5h.01M5 9h.01M5 13h.01M4 19h16" />
                            </svg>
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-white">Smart Survey Discovery</p>
                            <p className="text-[11px] text-slate-300">Futuristic matching for high-value survey tasks.</p>
                        </div>
                    </div>
                </div>

                <div className="mt-3 flex gap-2">
                    <div className="flex min-h-[40px] flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-2.5">
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.1-4.4a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search surveys..."
                            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                        />
                    </div>
                    <button
                        type="button"
                        className="inline-flex min-h-[40px] items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 text-xs font-semibold text-slate-200"
                    >
                        <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5h18M6 12h12M10 19h4" />
                        </svg>
                        Filter
                    </button>
                </div>
            </div>


            {err ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{err}</p> : null}

            {loading ? <p className="text-xs text-[#A0AEC0]">Loading…</p> : null}

            {!loading && section === 'available' && !anyAvailable ? (
                <RmsCard variant="elevated" className="!rounded-[22px] !border-[#8B5CF6]/35 !bg-[#11152a]/90 !p-4 text-left text-xs text-[#A0AEC0]">
                    <div className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#8B5CF6]/45 bg-[#7C3AED]/20 text-[#DDD6FE]">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4m0 4h.01M5.6 19h12.8A1.6 1.6 0 0020 17.4V6.6A1.6 1.6 0 0018.4 5H5.6A1.6 1.6 0 004 6.6v10.8A1.6 1.6 0 005.6 19z" />
                            </svg>
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-white">No surveys right now</p>
                            <p className="mt-0.5 text-xs text-slate-300">Check back later or finish programme setup.</p>
                        </div>
                    </div>
                </RmsCard>
            ) : null}

            {!loading && section === 'completed' && filteredCompleted.length === 0 ? (
                <RmsCard variant="elevated" className="!p-4 text-center text-xs text-[#A0AEC0]">
                    No completed surveys yet. Open <strong className="text-white">Available</strong> to start.
                </RmsCard>
            ) : null}

            {!loading && section === 'available'
                ? TIER_ORDER.map((tier) => {
                      const list = groupedAvailable[tier] ?? [];
                      const meta = TIER_SECTIONS[tier];
                      const expanded = openAvailableTiers[tier];
                      return (
                          <RmsCard key={tier} variant="elevated" className={`!p-2.5 sm:!p-3.5 ${meta.cardBorder}`}>
                              <div className="flex items-center justify-between gap-2.5">
                                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.iconBg} ring-1`}>
                                          <SurveyIcon strokeClass={meta.iconStroke} />
                                      </span>
                                      <div className="min-w-0">
                                          <h2 className={`text-[15px] font-bold leading-tight ${meta.titleClass}`}>{meta.title.toUpperCase()}</h2>
                                          <p className="line-clamp-1 text-[10.5px] text-slate-300">{meta.subtitle}</p>
                                      </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                      <span className={`rounded-xl border px-2 py-1 text-[10px] font-semibold ${meta.chip}`}>
                                          {list.length} Available
                                      </span>
                                      <button
                                          type="button"
                                          onClick={() =>
                                              setOpenAvailableTiers((p) => ({
                                                  ...p,
                                                  [tier]: !p[tier],
                                              }))
                                          }
                                          aria-expanded={expanded}
                                          aria-controls={`tier-available-${tier}`}
                                          id={`tier-available-toggle-${tier}`}
                                          className={tierToggleBtn}
                                      >
                                          {expanded ? 'Hide' : 'Show →'}
                                      </button>
                                  </div>
                              </div>
                              {expanded ? (
                                  <>
                                      <div className={meta.accentStrip} aria-hidden />
                                      <div id={`tier-available-${tier}`} className="mt-1.5 space-y-1.5">
                                          {list.length === 0 ? (
                                              <p className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-[#94A3B8]">None in this tier.</p>
                                          ) : (
                                              list.map((s) => <AvailableSurveyRow key={s.id} s={s} tier={tier} />)
                                          )}
                                      </div>
                                  </>
                              ) : null}
                          </RmsCard>
                      );
                  })
                : null}

            {!loading && section === 'completed' && filteredCompleted.length > 0 ? (
                <div className="overflow-x-auto rounded-[22px] border border-white/10 bg-[#101525]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <table className="w-full min-w-[520px] border-collapse text-xs text-white">
                            <thead>
                                <tr className="border-b border-[#f5f0e633] bg-[#3d3428]">
                                    <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-white sm:px-3">#</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-white sm:px-3">Created</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-white sm:px-3">Amt</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-white sm:px-3">Status</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-white sm:px-3">In wallet</th>
                                    <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-white sm:px-3">Paid</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCompleted.map((row, idx) => {
                                    const amt = row.amountUsd ?? row.estimatedRewardUsd ?? 0;
                                    const success =
                                        row.paymentStatus === 'success' ||
                                        row.paymentStatus === 'paid';
                                    const inWalletIso =
                                        row.walletCreditedAt ||
                                        row.expectedInWallet ||
                                        (!success && row.respondentPayoutAt) ||
                                        null;
                                    return (
                                        <tr
                                            key={row.responseId}
                                            className="border-t border-[#ffffff14] bg-[#2e281c] hover:bg-[#363026]/95"
                                        >
                                            <td className="px-2 py-2 text-center tabular-nums text-white sm:px-3">{idx + 1}</td>
                                            <td className="px-2 py-2 tabular-nums text-[#e8ddd0] sm:px-3">{fmtCompletedTableDate(row.createdAt)}</td>
                                            <td className="px-2 py-2 font-medium tabular-nums text-white sm:px-3">{fmtUsd(amt)}</td>
                                            <td className="px-2 py-2 font-semibold text-white sm:px-3">{row.status ?? 'Complete'}</td>
                                                    <td className="px-2 py-2 tabular-nums text-[#e8ddd0] sm:px-3">
                                                <span
                                                    className="block"
                                                    title={
                                                        success
                                                            ? 'Wallet credit time'
                                                            : surveyIncomePayoutDelayDays > 0
                                                                ? `Typical delay: ${surveyIncomePayoutDelayDays} days after completion`
                                                                : 'Instant credit on completion'
                                                    }
                                                >
                                                    {fmtCompletedTableDate(inWalletIso)}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-center sm:px-3">
                                                {success ? (
                                                    <span className="inline-block min-w-[3.25rem] rounded border border-emerald-700/60 bg-emerald-700 px-2 py-0.5 text-[9px] font-semibold uppercase text-white">
                                                        Paid
                                                    </span>
                                                ) : (
                                                    <span className="inline-block min-w-[3.25rem] rounded border border-red-800/80 bg-[#c41e1e] px-2 py-0.5 text-[9px] font-semibold uppercase text-white">
                                                        Unpaid
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                </div>
            ) : null}

            <RmsCard variant="elevated" className="!rounded-[24px] !border-white/10 !bg-[#0f162a]/95 !p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#8B5CF6]/45 bg-[#7C3AED]/20 text-[#DDD6FE]">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.077 3.323a1 1 0 00.95.69h3.495c.969 0 1.371 1.24.588 1.81l-2.828 2.055a1 1 0 00-.364 1.118l1.078 3.323c.3.921-.755 1.688-1.54 1.118l-2.829-2.055a1 1 0 00-1.175 0l-2.828 2.055c-.785.57-1.84-.197-1.54-1.118l1.078-3.323a1 1 0 00-.364-1.118L2.98 8.75c-.783-.57-.38-1.81.588-1.81h3.495a1 1 0 00.95-.69l1.077-3.323z" />
                            </svg>
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-white">Complete more surveys</p>
                            <p className="mt-1 text-xs text-slate-300">More surveys, more rewards!</p>
                        </div>
                    </div>
                    <button type="button" className="rounded-xl border border-[#8B5CF6]/45 px-3 py-1.5 text-[11px] font-semibold text-[#C4B5FD]">
                        How it works?
                    </button>
                </div>
            </RmsCard>

            <div className="fixed bottom-2 left-1/2 z-20 w-[min(460px,calc(100vw-20px))] -translate-x-1/2 rounded-[24px] border border-white/10 bg-[#0a1020]/95 p-2 shadow-[0_20px_44px_rgba(0,0,0,0.5)] backdrop-blur-xl md:hidden">
                <div className="grid grid-cols-5 gap-1 text-[10px]">
                    {['Dashboard', 'Team', 'Surveys', 'Wallet', 'More'].map((item) => (
                        <span
                            key={item}
                            className={`flex min-h-[44px] items-center justify-center rounded-xl font-semibold ${
                                item === 'Surveys'
                                    ? 'bg-gradient-to-r from-[#7C3AED]/45 to-[#2563EB]/30 text-white ring-1 ring-[#A78BFA]/45 shadow-[0_8px_20px_rgba(124,58,237,0.35)]'
                                    : 'text-slate-300'
                            }`}
                        >
                            {item}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { prepareSanctum } from '../../lib/auth';
import { formatTransactionDetailRow } from '../lib/formatTransactionDetail';
import { RmsCard, RmsScreenTitle } from '../components/rms';

const TYPE_VALUES = [
    '',
    'deposit_credit',
    'withdrawal',
    'survey_credit',
    'direct_commission',
    'survey_level_income',
    'matching',
    'panel_matching',
    'sub_panel_matching',
    'super_sub_panel_matching',
    'p2p_transfer_in',
    'p2p_transfer_out',
    'plan_purchase',
];

const TYPE_GROUPS = {
    matching: ['active_panel_matching', 'panel_matching', 'sub_panel_matching', 'super_sub_panel_matching'],
};

function humanizeType(type) {
    return String(type)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function labelType(value, t) {
    if (!value) return t('member.transactionsPage.types.all');
    if (value === 'matching') return t('member.transactionsPage.matchingAll');
    const key = `member.transactionsPage.types.${value}`;
    return t(key, { defaultValue: humanizeType(value) });
}

/** Accent ring + fill for transaction type pills */
function typeBadgeTone(type) {
    const tones = {
        direct_commission: 'border-emerald-400/40 bg-emerald-500/[0.12] text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.12)]',
        survey_credit: 'border-sky-400/35 bg-sky-500/[0.12] text-sky-100',
        survey_level_income: 'border-violet-400/40 bg-violet-500/[0.14] text-violet-100',
        deposit_credit: 'border-cyan-400/35 bg-cyan-500/[0.12] text-cyan-100',
        withdrawal: 'border-amber-400/40 bg-amber-500/[0.12] text-amber-100',
        active_panel_matching: 'border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200',
        panel_matching: 'border-teal-400/35 bg-teal-500/[0.10] text-teal-100',
        sub_panel_matching: 'border-indigo-400/35 bg-indigo-500/[0.12] text-indigo-100',
        super_sub_panel_matching: 'border-fuchsia-400/40 bg-fuchsia-500/[0.12] text-fuchsia-100',
        p2p_transfer_in: 'border-lime-400/30 bg-lime-500/[0.10] text-lime-100',
        p2p_transfer_out: 'border-rose-400/35 bg-rose-500/[0.12] text-rose-100',
        plan_purchase: 'border-amber-300/35 bg-amber-500/[0.10] text-amber-50',
        main_to_p2p: 'border-blue-400/35 bg-blue-500/[0.10] text-blue-100',
        p2p_to_main: 'border-blue-400/35 bg-blue-500/[0.10] text-blue-100',
        activation_fee: 'border-orange-400/40 bg-orange-500/[0.12] text-orange-100',
        minimum_panel_fee: 'border-orange-400/35 bg-orange-500/[0.10] text-orange-100',
        sub_panel_fee: 'border-sky-400/30 bg-sky-500/[0.08] text-sky-100',
        super_sub_panel_fee: 'border-purple-400/35 bg-purple-500/[0.12] text-purple-100',
        signup_bonus: 'border-pink-400/35 bg-pink-500/[0.12] text-pink-100',
    };
    return tones[type] ?? 'border-white/[0.14] bg-white/[0.06] text-[#CBD5E1]';
}

function TypePill({ type, t }) {
    const label = labelType(type, t);
    const tone = typeBadgeTone(type);
    const showD = type === 'direct_commission';
    return (
        <span
            className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold leading-snug ${tone}`}
        >
            {showD ? (
                <span className="shrink-0 rounded bg-black/30 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-200">
                    D
                </span>
            ) : null}
            <span className="min-w-0 break-words text-left">{label}</span>
        </span>
    );
}

function fmtRowDate(iso, locale) {
    if (!iso) return '—';
    try {
        return new Intl.DateTimeFormat(locale || 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
    } catch {
        return new Date(iso).toLocaleString(locale);
    }
}

export default function MemberTransactionsPage() {
    const { t, i18n } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialType = useMemo(() => {
        const fromTypes = searchParams.get('types');
        if (fromTypes) {
            const groupKey = Object.keys(TYPE_GROUPS).find((k) => TYPE_GROUPS[k].join(',') === fromTypes);
            if (groupKey) return groupKey;
        }
        return searchParams.get('type') ?? '';
    }, [searchParams]);
    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [type, setType] = useState(initialType);
    const [err, setErr] = useState(null);

    const fmtUsd = useCallback(
        (s) => {
            const n = Number.parseFloat(s);
            if (Number.isNaN(n)) return s;
            try {
                return new Intl.NumberFormat(i18n.language || 'en', { style: 'currency', currency: 'USD' }).format(n);
            } catch {
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
            }
        },
        [i18n.language],
    );

    const load = useCallback(async () => {
        setErr(null);
        try {
            await prepareSanctum();
            const filterParams = {};
            if (type) {
                if (TYPE_GROUPS[type]) {
                    filterParams.types = TYPE_GROUPS[type].join(',');
                } else {
                    filterParams.type = type;
                }
            }
            const { data } = await window.axios.get('api/member/wallet/transactions', {
                params: { page, per_page: 20, ...filterParams },
            });
            setRows(data.data ?? []);
            setMeta(data.meta ?? null);
        } catch (e) {
            setErr(e.response?.data?.message ?? e.message ?? t('member.ui.failedToLoad'));
        }
    }, [page, type, t]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="relative space-y-4 pb-2">
            <div className="pointer-events-none absolute -top-12 right-0 h-40 w-40 rounded-full bg-violet-600/15 blur-[80px]" />
            <RmsScreenTitle
                eyebrow={t('member.transactionsPage.eyebrow')}
                title={t('member.transactionsPage.title')}
                subtitle={t('member.transactionsPage.subtitle')}
            />

            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={type}
                    onChange={(e) => {
                        const next = e.target.value;
                        setType(next);
                        setPage(1);
                        const params = new URLSearchParams(searchParams);
                        params.delete('type');
                        params.delete('types');
                        if (next) {
                            if (TYPE_GROUPS[next]) {
                                params.set('types', TYPE_GROUPS[next].join(','));
                            } else {
                                params.set('type', next);
                            }
                        }
                        setSearchParams(params, { replace: true });
                    }}
                    className="w-full max-w-full rounded-xl border border-violet-300/25 bg-[#0b1020]/90 px-3 py-2.5 text-sm text-white shadow-[0_0_18px_rgba(139,92,246,0.15)] focus:border-[#8E6BFF]/50 focus:outline-none focus:ring-2 focus:ring-[#6C4CF1]/25 sm:w-auto"
                >
                    {TYPE_VALUES.map((v) => (
                        <option key={v || 'all'} value={v}>
                            {labelType(v, t)}
                        </option>
                    ))}
                </select>
            </div>

            {err ? <p className="text-sm text-red-400">{err}</p> : null}

            <RmsCard
                variant="elevated"
                className="!overflow-hidden !rounded-[20px] !border-violet-300/25 !bg-[#080d18]/85 !shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl"
                padding={false}
            >
                {rows.length === 0 ? (
                    <p className="p-8 text-center text-sm text-[#A0AEC0]">{t('member.transactionsPage.noTransactions')}</p>
                ) : (
                    <>
                        {/* Mobile: compact cards, full width, no horizontal clip */}
                        <ul className="divide-y divide-white/[0.06] lg:hidden">
                            {rows.map((row, idx) => {
                                const isCredit = Number.parseFloat(row.amount) >= 0;
                                return (
                                    <li
                                        key={row.id}
                                        className={[
                                            'px-3 py-2.5 transition',
                                            idx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent',
                                        ].join(' ')}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <TypePill type={row.type} t={t} />
                                            <span
                                                className={`shrink-0 text-[15px] font-bold tabular-nums tracking-tight ${
                                                    isCredit ? 'text-emerald-400' : 'text-amber-300'
                                                }`}
                                            >
                                                {fmtUsd(row.amount)}
                                            </span>
                                        </div>
                                        <p className="mt-1.5 text-[12px] leading-snug text-[#94A3B8]">
                                            {formatTransactionDetailRow(row, t)}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#64748B]">
                                            <span>{fmtRowDate(row.created_at, i18n.language)}</span>
                                            <span className="font-mono">
                                                {t('member.transactionsPage.colTxId')} #{row.id}
                                            </span>
                                            <span className="tabular-nums">
                                                {t('member.transactionsPage.colBalanceAfter')}: {fmtUsd(row.balance_after)}
                                            </span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Desktop / tablet: table */}
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full min-w-[880px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/[0.03] text-[#A0AEC0]">
                                        <th className="px-3 py-2.5 text-xs font-semibold">{t('member.transactionsPage.colDate')}</th>
                                        <th className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap">
                                            {t('member.transactionsPage.colTxId')}
                                        </th>
                                        <th className="min-w-[9rem] max-w-[14rem] px-3 py-2.5 text-xs font-semibold">
                                            {t('member.transactionsPage.colType')}
                                        </th>
                                        <th className="min-w-[200px] px-3 py-2.5 text-xs font-semibold">
                                            {t('member.transactionsPage.colDetail')}
                                        </th>
                                        <th className="px-3 py-2.5 text-right text-xs font-semibold">
                                            {t('member.transactionsPage.colAmount')}
                                        </th>
                                        <th className="px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap">
                                            {t('member.transactionsPage.colBalanceAfter')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, idx) => (
                                        <tr
                                            key={row.id}
                                            className={[
                                                'border-b border-white/[0.05] align-top transition hover:bg-violet-500/[0.05]',
                                                idx % 2 === 0 ? 'bg-white/[0.01]' : '',
                                            ].join(' ')}
                                        >
                                            <td className="px-3 py-2 text-xs text-[#A0AEC0] whitespace-nowrap">
                                                {fmtRowDate(row.created_at, i18n.language)}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-xs text-white/90 whitespace-nowrap">
                                                {row.id}
                                            </td>
                                            <td className="max-w-[14rem] px-3 py-2">
                                                <TypePill type={row.type} t={t} />
                                            </td>
                                            <td className="max-w-md px-3 py-2 text-xs leading-snug text-[#94A3B8]">
                                                {formatTransactionDetailRow(row, t)}
                                            </td>
                                            <td
                                                className={`px-3 py-2 text-right text-sm tabular-nums font-semibold whitespace-nowrap ${
                                                    Number.parseFloat(row.amount) < 0 ? 'text-amber-400' : 'text-emerald-400'
                                                }`}
                                            >
                                                {fmtUsd(row.amount)}
                                            </td>
                                            <td className="px-3 py-2 text-right text-xs tabular-nums text-[#A0AEC0] whitespace-nowrap">
                                                {fmtUsd(row.balance_after)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </RmsCard>

            {meta && meta.last_page > 1 ? (
                <div className="flex flex-wrap items-center justify-center gap-3 pb-1">
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="rounded-xl border border-violet-300/25 bg-[#0b1020]/90 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.12)] transition hover:border-violet-300/45 disabled:opacity-40"
                    >
                        {t('member.ui.previous')}
                    </button>
                    <span className="text-sm text-[#A0AEC0]">
                        {t('member.ui.pageOf', { current: meta.current_page, last: meta.last_page })}
                    </span>
                    <button
                        type="button"
                        disabled={page >= meta.last_page}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-xl border border-violet-300/25 bg-[#0b1020]/90 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.12)] transition hover:border-violet-300/45 disabled:opacity-40"
                    >
                        {t('member.ui.next')}
                    </button>
                </div>
            ) : null}
        </div>
    );
}

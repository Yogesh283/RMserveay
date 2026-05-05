import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    'panel_matching',
    'sub_panel_matching',
    'super_sub_panel_matching',
    'p2p_transfer_in',
    'p2p_transfer_out',
    'plan_purchase',
];

function labelType(value, t) {
    if (!value) return t('member.transactionsPage.types.all');
    return t(`member.transactionsPage.types.${value}`);
}

export default function MemberTransactionsPage() {
    const { t, i18n } = useTranslation();
    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [type, setType] = useState('');
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
            const { data } = await window.axios.get('api/member/wallet/transactions', {
                params: { page, per_page: 20, ...(type ? { type } : {}) },
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
        <div className="relative space-y-6">
            <RmsScreenTitle
                eyebrow={t('member.transactionsPage.eyebrow')}
                title={t('member.transactionsPage.title')}
                subtitle={t('member.transactionsPage.subtitle')}
            />

            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={type}
                    onChange={(e) => {
                        setType(e.target.value);
                        setPage(1);
                    }}
                    className="rounded-xl border border-white/10 bg-[#111827] px-3 py-2.5 text-sm text-white focus:border-[#8E6BFF]/50 focus:outline-none focus:ring-2 focus:ring-[#6C4CF1]/25"
                >
                    {TYPE_VALUES.map((v) => (
                        <option key={v || 'all'} value={v}>
                            {labelType(v, t)}
                        </option>
                    ))}
                </select>
            </div>

            {err ? <p className="text-sm text-red-400">{err}</p> : null}

            <RmsCard variant="elevated" className="!p-0 overflow-x-auto" padding={false}>
                <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/10 text-[#A0AEC0]">
                            <th className="px-4 py-3 font-semibold">{t('member.transactionsPage.colDate')}</th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">{t('member.transactionsPage.colTxId')}</th>
                            <th className="px-4 py-3 font-semibold">{t('member.transactionsPage.colType')}</th>
                            <th className="min-w-[220px] px-4 py-3 font-semibold">{t('member.transactionsPage.colDetail')}</th>
                            <th className="px-4 py-3 text-right font-semibold">{t('member.transactionsPage.colAmount')}</th>
                            <th className="px-4 py-3 text-right font-semibold">{t('member.transactionsPage.colBalanceAfter')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="border-b border-white/5 align-top">
                                <td className="px-4 py-3 text-xs text-[#A0AEC0] whitespace-nowrap">
                                    {row.created_at ? new Date(row.created_at).toLocaleString(i18n.language) : t('member.ui.dash')}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-white/90 whitespace-nowrap">{row.id}</td>
                                <td className="px-4 py-3 text-[#CBD5E1]">{labelType(row.type, t)}</td>
                                <td className="max-w-md px-4 py-3 text-xs leading-snug text-[#A0AEC0] sm:text-[13px]">
                                    {formatTransactionDetailRow(row, t)}
                                </td>
                                <td
                                    className={`px-4 py-3 text-right tabular-nums font-semibold whitespace-nowrap ${
                                        Number.parseFloat(row.amount) < 0 ? 'text-amber-400' : 'text-emerald-400'
                                    }`}
                                >
                                    {fmtUsd(row.amount)}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums text-[#A0AEC0] whitespace-nowrap">{fmtUsd(row.balance_after)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rows.length === 0 ? <p className="p-6 text-center text-sm text-[#A0AEC0]">{t('member.transactionsPage.noTransactions')}</p> : null}
            </RmsCard>

            {meta && meta.last_page > 1 ? (
                <div className="flex items-center justify-center gap-3">
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="rounded-xl border border-white/10 bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
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
                        className="rounded-xl border border-white/10 bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                        {t('member.ui.next')}
                    </button>
                </div>
            ) : null}
        </div>
    );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { prepareSanctum } from '../../lib/auth';
import { formatTransactionDetailRow } from '../lib/formatTransactionDetail';
import { RmsButtonLink, RmsCard, RmsScreenTitle } from '../components/rms';

function txTypeLabel(type, t) {
    const k = `member.transactionsPage.types.${type}`;
    const tr = t(k);
    if (tr !== k) return tr;
    return String(type).replace(/_/g, ' ');
}

export default function MemberWalletHubPage() {
    const { t, i18n } = useTranslation();
    const [overview, setOverview] = useState(null);
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
            const { data } = await window.axios.get('api/member/wallet/overview');
            setOverview(data);
        } catch (e) {
            setErr(e.response?.data?.message ?? e.message ?? t('member.ui.failedToLoad'));
        }
    }, [t]);

    useEffect(() => {
        load();
    }, [load]);

    const quickLinks = useMemo(
        () => [
            { to: '/member/wallet/deposit', label: t('member.walletHub.deposit') },
            { to: '/member/wallet/internal', label: t('member.ui.mainP2p') },
            { to: '/member/wallet/p2p', label: t('member.walletHub.p2pSendQr') },
        ],
        [t, i18n.resolvedLanguage],
    );

    return (
        <div className="relative space-y-6">
            <RmsScreenTitle eyebrow={t('member.walletHub.eyebrow')} title={t('member.walletHub.title')} />

            {err ? <p className="text-sm text-red-400">{err}</p> : null}

            <div className="relative overflow-hidden rounded-[24px] border border-[#8E6BFF]/25 bg-gradient-to-br from-[#6C4CF1]/22 via-[#111827] to-[#0B0F1A] p-5 shadow-[0_0_40px_rgba(108,76,241,0.18)]">
                <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-[#8E6BFF]/15 blur-2xl" />
                <p className="relative text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A0AEC0]">{t('member.walletHub.mainWalletEyebrow')}</p>
                <p className="relative mt-2 text-3xl font-bold tabular-nums text-white">
                    {overview ? fmtUsd(overview.wallet_balance) : t('member.ui.dash')}
                </p>
                <div className="relative mt-5 flex flex-wrap gap-2">
                    <RmsButtonLink to="/member/wallet/withdraw" variant="neon" size="sm" className="!w-auto flex-1 min-w-[120px]">
                        {t('member.walletHub.withdraw')}
                    </RmsButtonLink>
                    <RmsButtonLink to="/member/wallet/deposit" variant="ghost" size="sm" className="!w-auto flex-1 min-w-[120px] border-[#8E6BFF]/25">
                        {t('member.walletHub.deposit')}
                    </RmsButtonLink>
                </div>
            </div>

            {overview ? (
                <div className="rounded-2xl border border-white/10 bg-[#0B0F1A]/60 px-4 py-3 text-sm text-[#A0AEC0]">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">{t('member.walletHub.p2pNote')}</span>
                    <p className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-lg font-bold tabular-nums text-emerald-400">{fmtUsd(overview.p2p_wallet_balance ?? 0)}</span>
                        <Link to="/member/wallet/internal" className="shrink-0 text-sm font-semibold text-[#8E6BFF] hover:underline">
                            {t('member.ui.mainP2p')}
                        </Link>
                    </p>
                </div>
            ) : null}

            <RmsCard variant="elevated" className="!p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A0AEC0]">{t('member.walletHub.quickLinks')}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {quickLinks.map((l) => (
                        <Link
                            key={l.to}
                            to={l.to}
                            className="rounded-2xl border border-white/10 bg-[#0B0F1A]/50 px-4 py-3 text-sm font-semibold text-white transition hover:border-[#8E6BFF]/35 active:scale-[0.98]"
                        >
                            {l.label}
                        </Link>
                    ))}
                </div>
            </RmsCard>

            {overview?.recent_transactions?.length > 0 ? (
                <RmsCard variant="elevated" className="!p-0 overflow-hidden" padding={false}>
                    <div className="border-b border-white/10 px-4 py-3">
                        <p className="text-sm font-bold text-white">{t('member.walletHub.recentTitle')}</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[320px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-[#A0AEC0]">
                                    <th className="px-4 py-2 font-semibold">{t('member.walletHub.colType')}</th>
                                    <th className="px-4 py-2 font-semibold">{t('member.walletHub.colAmount')}</th>
                                    <th className="px-4 py-2 font-semibold">{t('member.walletHub.colWhen')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overview.recent_transactions.map((row) => (
                                    <tr key={row.id} className="border-b border-white/5">
                                        <td className="max-w-[min(100vw-3rem,280px)] px-4 py-2.5 text-[#A0AEC0] sm:max-w-none">
                                            <div className="font-medium text-white/90">{txTypeLabel(row.type, t)}</div>
                                            <div className="mt-1 text-[10px] leading-snug text-[#94A3B8]">{formatTransactionDetailRow(row, t)}</div>
                                        </td>
                                        <td
                                            className={`px-4 py-2.5 tabular-nums font-medium ${
                                                Number.parseFloat(row.amount) < 0 ? 'text-amber-400' : 'text-emerald-400'
                                            }`}
                                        >
                                            {fmtUsd(row.amount)}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-[#A0AEC0]">
                                            {row.created_at ? new Date(row.created_at).toLocaleString(i18n.language) : t('member.ui.dash')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </RmsCard>
            ) : (
                <p className="text-sm text-[#A0AEC0]">{t('member.walletHub.noTransactions')}</p>
            )}
        </div>
    );
}

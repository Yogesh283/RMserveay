/**
 * Human-readable detail for wallet transaction rows (API: `detail`, `meta_summary`, `p2p_counterparty`).
 */
export function formatTransactionDetailRow(row, t) {
    if (
        (row.type === 'p2p_transfer_out' || row.type === 'p2p_transfer_in') &&
        row.p2p_counterparty &&
        row.p2p_counterparty.user_id != null
    ) {
        const c = row.p2p_counterparty;
        const name = c.name || t('member.dashboard.memberFallback');
        const uid = c.login_uid != null && String(c.login_uid) !== '' ? String(c.login_uid) : '—';
        return row.type === 'p2p_transfer_out'
            ? t('member.transactionsPage.p2pOutDetail', { name, uid, id: c.user_id })
            : t('member.transactionsPage.p2pInDetail', { name, uid, id: c.user_id });
    }
    return row.detail ?? row.meta_summary ?? t('member.ui.dash');
}

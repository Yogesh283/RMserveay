/**
 * Human-readable detail for wallet transaction rows (API: `detail`, `meta_summary`, `p2p_counterparty`).
 */
export function formatTransactionDetailRow(row, t) {
    const detailMap = {
        active_panel_matching: 'Active Panel Matching Payout',
        panel_matching: 'Sub Panel Matching Payout',
        sub_panel_matching: 'Sub Panel Matching Payout',
        super_sub_panel_matching: 'Super Panel Matching Payout',
        sub_panel_fee: 'Sub Panel Slot Entry Fee',
        super_sub_panel_fee: 'Super Panel Slot Entry Fee',
        active_panel_fee: 'Active Panel Entry Fee',
    };
    if (detailMap[row.type]) {
        return detailMap[row.type];
    }

    if (
        (row.type === 'p2p_transfer_out' || row.type === 'p2p_transfer_in') &&
        row.p2p_counterparty &&
        row.p2p_counterparty.user_id != null
    ) {
        const c = row.p2p_counterparty;
        const uid = c.login_uid != null && String(c.login_uid) !== '' ? String(c.login_uid) : '—';
        const direction = row.type === 'p2p_transfer_out' ? 'sent to' : 'received from';
        return `P2P ${direction} User ID ${uid} · #${c.user_id}`;
    }
    return row.detail ?? row.meta_summary ?? t('member.ui.dash');
}

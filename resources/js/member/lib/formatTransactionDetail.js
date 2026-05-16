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

    if (row.type === 'direct_commission') {
        let text = row.detail ?? row.meta_summary ?? t('member.ui.dash');
        const m = row.meta;
        if (m && typeof m === 'object') {
            const bits = [];
            if (m.base_amount != null && String(m.base_amount).trim() !== '') {
                const b = Number.parseFloat(String(m.base_amount));
                if (!Number.isNaN(b)) {
                    bits.push(`base $${b.toFixed(2)}`);
                }
            }
            if (m.commission_rate != null && String(m.commission_rate).trim() !== '') {
                const r = Number.parseFloat(String(m.commission_rate));
                if (!Number.isNaN(r)) {
                    const pct = r > 0 && r <= 1 ? Math.round(r * 100) : Math.round(r);
                    bits.push(`${pct}%`);
                }
            }
            if (bits.length > 0) {
                text = `${text} · ${bits.join(' · ')}`;
            }
        }
        return text;
    }

    return row.detail ?? row.meta_summary ?? t('member.ui.dash');
}

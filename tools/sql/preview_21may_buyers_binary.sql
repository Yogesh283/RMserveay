-- 21-May buyers: binary tree mein hain ya nahi (closing 0 ka reason)
SET @d = '2026-05-21';

SELECT wt.type, wt.user_id, u.login_uid, u.binary_parent_id, u.binary_side,
       DATE(wt.created_at) AS tx_date, wt.created_at
FROM wallet_transactions wt
JOIN users u ON u.id = wt.user_id
WHERE wt.type IN ('minimum_panel_fee', 'sub_panel_fee', 'super_sub_panel_fee')
  AND DATE(wt.created_at) = @d
ORDER BY wt.type, wt.id;

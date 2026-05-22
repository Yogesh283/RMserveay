-- =============================================================================
-- Kyon preview empty? — yeh queries order mein chalao (READ ONLY)
-- Preview default: kal = DATE_SUB(CURDATE(), INTERVAL 1 DAY) (active/sub/super)
-- =============================================================================

-- 1) Aaj / kal (preview @closing_date ke liye)
SELECT CURDATE() AS server_today,
       DATE_SUB(CURDATE(), INTERVAL 1 DAY) AS preview_yesterday,
       NOW() AS server_now;

-- 2) Closing type ki purchases kab-kab hui (last 30 din)
SELECT
    DATE(created_at) AS purchase_date,
    type,
    COUNT(*) AS cnt
FROM wallet_transactions
WHERE type IN ('minimum_panel_fee', 'sub_panel_fee', 'super_sub_panel_fee')
  AND created_at >= CURDATE() - INTERVAL 30 DAY
GROUP BY DATE(created_at), type
ORDER BY purchase_date DESC, type;

-- 3) Koi bhi closing income pehle kab pay hui?
SELECT
    closing_date,
    scope,
    COUNT(*) AS rows_cnt,
    SUM(CASE WHEN payout_usd > 0 THEN 1 ELSE 0 END) AS paid_rows,
    SUM(payout_usd) AS total_paid
FROM binary_daily_closings
GROUP BY closing_date, scope
ORDER BY closing_date DESC
LIMIT 30;

-- 4) 2024-05-21 par kuch hai ya nahi? (screenshot wali date)
SELECT type, COUNT(*) AS cnt
FROM wallet_transactions
WHERE type IN ('minimum_panel_fee', 'sub_panel_fee', 'super_sub_panel_fee')
  AND DATE(created_at) = '2024-05-21';

-- 5) 2026-05-21 par (sahi saal)
SELECT type, COUNT(*) AS cnt
FROM wallet_transactions
WHERE type IN ('minimum_panel_fee', 'sub_panel_fee', 'super_sub_panel_fee')
  AND DATE(created_at) = '2026-05-21';

-- 6) Sabse busy recent date (preview ke liye date yahan se lo)
SELECT DATE(created_at) AS d, COUNT(*) AS purchases
FROM wallet_transactions
WHERE type IN ('minimum_panel_fee', 'sub_panel_fee', 'super_sub_panel_fee')
GROUP BY DATE(created_at)
ORDER BY purchases DESC
LIMIT 10;

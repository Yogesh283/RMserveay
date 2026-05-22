-- =============================================================================
-- Kyon binary:daily-closing --date=... par "Processed 0 closings"?
-- READ ONLY — phpMyAdmin / mysql client
-- =============================================================================
SET @closing_date = '2026-05-21';

-- 1) Us date ki closing rows
SELECT closing_date, scope, COUNT(*) AS rows_cnt,
       SUM(CASE WHEN payout_usd > 0 THEN 1 ELSE 0 END) AS paid_rows,
       SUM(payout_usd) AS total_paid
FROM binary_daily_closings
WHERE closing_date = @closing_date
GROUP BY closing_date, scope;

-- 2) Us din kitni purchases (closing types)
SELECT type, COUNT(*) AS tx_cnt, COUNT(DISTINCT user_id) AS buyers
FROM wallet_transactions
WHERE type IN ('minimum_panel_fee', 'sub_panel_fee', 'super_sub_panel_fee')
  AND DATE(created_at) = @closing_date
GROUP BY type;

-- 3) Stored carry: dono legs > 0 (income possible) vs sirf ek leg (skip / 0 pairs)
SELECT 'active_panel' AS scope,
       SUM(CASE WHEN active_panel_match_carry_left > 0 AND active_panel_match_carry_right > 0 THEN 1 ELSE 0 END) AS dono_leg_carry,
       SUM(CASE WHEN (active_panel_match_carry_left > 0 OR active_panel_match_carry_right > 0)
                 AND NOT (active_panel_match_carry_left > 0 AND active_panel_match_carry_right > 0) THEN 1 ELSE 0 END) AS sirf_ek_leg
FROM users
SELECT 'panel' AS scope,
       SUM(CASE WHEN panel_match_carry_left > 0 AND panel_match_carry_right > 0 THEN 1 ELSE 0 END) AS dono_leg_carry,
       SUM(CASE WHEN (panel_match_carry_left > 0 OR panel_match_carry_right > 0)
                 AND NOT (panel_match_carry_left > 0 AND panel_match_carry_right > 0) THEN 1 ELSE 0 END) AS sirf_ek_leg
FROM users;

SELECT 'super' AS scope,
       SUM(CASE WHEN super_panel_match_carry_left > 0 AND super_panel_match_carry_right > 0 THEN 1 ELSE 0 END) AS dono_leg_carry,
       SUM(CASE WHEN (super_panel_match_carry_left > 0 OR super_panel_match_carry_right > 0)
                 AND NOT (super_panel_match_carry_left > 0 AND super_panel_match_carry_right > 0) THEN 1 ELSE 0 END) AS sirf_ek_leg
FROM users;

-- 4) Sample: user 128 carry + last closings
SELECT id, active_panel_match_carry_left, active_panel_match_carry_right,
       panel_match_carry_left, panel_match_carry_right,
       super_panel_match_carry_left, super_panel_match_carry_right
FROM users WHERE id = 128;

SELECT closing_date, scope, left_carry_in, right_carry_in, pairs_matched, payout_usd,
       left_carry_out, right_carry_out
FROM binary_daily_closings
WHERE user_id = 128
ORDER BY closing_date DESC, id DESC
LIMIT 15;

-- =============================================================================
-- User sub-panel closing diagnose (example: id = 157)
-- phpMyAdmin: SET @user_id = 157; phir queries chalao
-- =============================================================================
SET @user_id = 157;
SET @closing_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY);

-- 1) User + stored binary carry (purana bucket — UI galat dikhata tha agar yahi match ho)
SELECT
    id,
    login_uid,
    name,
    panel_match_carry_left AS stored_carry_left,
    panel_match_carry_right AS stored_carry_right,
    sub_panel_count AS own_sub_panels
FROM users
WHERE id = @user_id;

-- 2) Team leg totals (UI: Total sub panels all time) — left / right subtree
SELECT 'left_leg' AS leg,
       COUNT(*) AS members,
       COALESCE(SUM(u.sub_panel_count), 0) AS total_sub_slots
FROM users u
WHERE u.id IN (
    WITH RECURSIVE subtree AS (
        SELECT id FROM users WHERE id = (SELECT left_child_id FROM users WHERE id = @user_id)
        UNION ALL
        SELECT c.id FROM users c
        INNER JOIN subtree s ON c.id IN (
            SELECT u2.left_child_id FROM users u2 WHERE u2.id = s.id
            UNION
            SELECT u2.right_child_id FROM users u2 WHERE u2.id = s.id
        )
    )
    SELECT id FROM subtree WHERE id IS NOT NULL
) AND (u.email IS NULL OR u.email NOT LIKE '%dummy%')

UNION ALL

SELECT 'right_leg',
       COUNT(*),
       COALESCE(SUM(u.sub_panel_count), 0)
FROM users u
WHERE u.id IN (
    WITH RECURSIVE subtree AS (
        SELECT id FROM users WHERE id = (SELECT right_child_id FROM users WHERE id = @user_id)
        UNION ALL
        SELECT c.id FROM users c
        INNER JOIN subtree s ON c.id IN (
            SELECT u2.left_child_id FROM users u2 WHERE u2.id = s.id
            UNION
            SELECT u2.right_child_id FROM users u2 WHERE u2.id = s.id
        )
    )
    SELECT id FROM subtree WHERE id IS NOT NULL
) AND (u.email IS NULL OR u.email NOT LIKE '%dummy%');

-- 3) Kal ki sub purchases per leg (UI: Sub panels yesterday)
SELECT
    CASE
        WHEN wt.user_id IN (
            WITH RECURSIVE subtree AS (
                SELECT id FROM users WHERE id = (SELECT left_child_id FROM users WHERE id = @user_id)
                UNION ALL
                SELECT c.id FROM users c
                INNER JOIN subtree s ON c.id IN (
                    SELECT u2.left_child_id FROM users u2 WHERE u2.id = s.id
                    UNION
                    SELECT u2.right_child_id FROM users u2 WHERE u2.id = s.id
                )
            )
            SELECT id FROM subtree WHERE id IS NOT NULL
        ) THEN 'left_leg'
        ELSE 'right_leg'
    END AS leg,
    COUNT(*) AS sub_fee_tx_yesterday
FROM wallet_transactions wt
WHERE wt.type = 'sub_panel_fee'
  AND DATE(wt.created_at) = @closing_date
  AND wt.user_id IN (
    WITH RECURSIVE subtree AS (
        SELECT id FROM users WHERE id = (SELECT left_child_id FROM users WHERE id = @user_id)
        UNION ALL
        SELECT id FROM users WHERE id = (SELECT right_child_id FROM users WHERE id = @user_id)
        UNION ALL
        SELECT c.id FROM users c
        INNER JOIN subtree s ON c.id IN (
            SELECT u2.left_child_id FROM users u2 WHERE u2.id = s.id
            UNION
            SELECT u2.right_child_id FROM users u2 WHERE u2.id = s.id
        )
    )
    SELECT id FROM subtree WHERE id IS NOT NULL
)
GROUP BY leg;

-- 4) Expected match math (opening carry from totals + kal)
--    Total L/R → carry 0 | (R-L) e.g. 63|243 → 0|180
--    Match in = opening_out + yesterday → e.g. 9|180 → pairs 9 → payout milestone 8 → out 0|171
SELECT
    @closing_date AS closing_date,
    bdc.scope,
    bdc.left_carry_in,
    bdc.right_carry_in,
    bdc.pairs_matched,
    bdc.left_carry_out,
    bdc.right_carry_out,
    bdc.payout_usd,
    bdc.left_lapsed,
    bdc.right_lapsed,
    JSON_UNQUOTE(JSON_EXTRACT(bdc.meta, '$.milestone_paid_usd')) AS milestone_usd,
    JSON_UNQUOTE(JSON_EXTRACT(bdc.meta, '$.daily_left')) AS meta_daily_left,
    JSON_UNQUOTE(JSON_EXTRACT(bdc.meta, '$.daily_right')) AS meta_daily_right,
    JSON_UNQUOTE(JSON_EXTRACT(bdc.meta, '$.opening_carry_right')) AS meta_opening_carry_right,
    JSON_UNQUOTE(JSON_EXTRACT(bdc.meta, '$.subtree_total_left')) AS meta_total_left,
    JSON_UNQUOTE(JSON_EXTRACT(bdc.meta, '$.subtree_total_right')) AS meta_total_right,
    JSON_UNQUOTE(JSON_EXTRACT(bdc.meta, '$.stored_carry_left_before')) AS stored_L_before,
    JSON_UNQUOTE(JSON_EXTRACT(bdc.meta, '$.stored_carry_right_before')) AS stored_R_before,
    bdc.created_at
FROM binary_daily_closings bdc
WHERE bdc.user_id = @user_id
  AND bdc.scope = 'panel'
ORDER BY bdc.closing_date DESC, bdc.id DESC
LIMIT 5;

-- 5) Kal ki sub matching wallet credit
SELECT id, type, amount, created_at, meta
FROM wallet_transactions
WHERE user_id = @user_id
  AND type IN ('panel_matching', 'sub_panel_matching')
  AND DATE(created_at) >= @closing_date
ORDER BY created_at DESC
LIMIT 10;

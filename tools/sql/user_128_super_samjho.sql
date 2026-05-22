-- =============================================================================
-- USER 128 — SUPER panel: poora scene samajhne ke liye (READ ONLY)
-- phpMyAdmin: upar se neeche order mein chalao
-- =============================================================================
SET @uid = 128;
SET @kal = '2026-05-21';   -- UI caption date; badal sakte ho

-- =============================================================================
-- STEP 1 — Aap ka account ab kya hai?
-- =============================================================================
SELECT
    '1_ACCOUNT' AS step,
    id,
    login_uid,
    super_panel_match_carry_left AS binary_carry_L,
    super_panel_match_carry_right AS binary_carry_R,
    super_panel_match_carry_right - super_panel_match_carry_left AS binary_diff,
    super_sub_panel_count AS apne_super_slots,
    IF(activation_fee_paid_at IS NOT NULL AND minimum_panel_fee_paid_at IS NOT NULL,
       'Haan — income mil sakti hai', 'Nahi — sirf carry, payout $0') AS active_panelist
FROM users
WHERE id = @uid;

-- =============================================================================
-- STEP 2 — Team totals (UI: Total super 29 | 80) — yeh SLOTS count hai
-- =============================================================================
-- Left leg ke neeche jitne users, unke super_sub_panel_count ka sum
SELECT '2A_LEFT_TEAM_TOTAL' AS step, COALESCE(SUM(super_sub_panel_count), 0) AS team_super_slots
FROM users
WHERE id IN (
    WITH RECURSIVE t AS (
        SELECT id FROM users WHERE id = (SELECT left_child_id FROM users WHERE id = @uid)
        UNION ALL
        SELECT c.id FROM users c
        INNER JOIN t ON c.id IN (
            SELECT x.left_child_id FROM users x WHERE x.id = t.id AND x.left_child_id IS NOT NULL
            UNION
            SELECT x.right_child_id FROM users x WHERE x.id = t.id AND x.right_child_id IS NOT NULL
        )
    )
    SELECT id FROM t WHERE id IS NOT NULL
);

SELECT '2B_RIGHT_TEAM_TOTAL' AS step, COALESCE(SUM(super_sub_panel_count), 0) AS team_super_slots
FROM users
WHERE id IN (
    WITH RECURSIVE t AS (
        SELECT id FROM users WHERE id = (SELECT right_child_id FROM users WHERE id = @uid)
        UNION ALL
        SELECT c.id FROM users c
        INNER JOIN t ON c.id IN (
            SELECT x.left_child_id FROM users x WHERE x.id = t.id AND x.left_child_id IS NOT NULL
            UNION
            SELECT x.right_child_id FROM users x WHERE x.id = t.id AND x.right_child_id IS NOT NULL
        )
    )
    SELECT id FROM t WHERE id IS NOT NULL
);

-- =============================================================================
-- STEP 3 — UI wali "51" kahan se? (80 - 29 = 51) — THEORY, binary bucket nahi
-- =============================================================================
SELECT
    '3_UI_TOTAL_CARRY_51' AS step,
    (SELECT COALESCE(SUM(super_sub_panel_count), 0) FROM users WHERE id IN (
        WITH RECURSIVE t AS (
            SELECT id FROM users WHERE id = (SELECT left_child_id FROM users WHERE id = @uid)
            UNION ALL
            SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                SELECT x.left_child_id FROM users x WHERE x.id = t.id
                UNION SELECT x.right_child_id FROM users x WHERE x.id = t.id
            )
        ) SELECT id FROM t WHERE id IS NOT NULL
    )) AS left_team_total,
    (SELECT COALESCE(SUM(super_sub_panel_count), 0) FROM users WHERE id IN (
        WITH RECURSIVE t AS (
            SELECT id FROM users WHERE id = (SELECT right_child_id FROM users WHERE id = @uid)
            UNION ALL
            SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                SELECT x.left_child_id FROM users x WHERE x.id = t.id
                UNION SELECT x.right_child_id FROM users x WHERE x.id = t.id
            )
        ) SELECT id FROM t WHERE id IS NOT NULL
    )) AS right_team_total,
    (SELECT COALESCE(SUM(super_sub_panel_count), 0) FROM users WHERE id IN (
        WITH RECURSIVE t AS (
            SELECT id FROM users WHERE id = (SELECT right_child_id FROM users WHERE id = @uid)
            UNION ALL
            SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                SELECT x.left_child_id FROM users x WHERE x.id = t.id
                UNION SELECT x.right_child_id FROM users x WHERE x.id = t.id
            )
        ) SELECT id FROM t WHERE id IS NOT NULL
    ))
    - (SELECT COALESCE(SUM(super_sub_panel_count), 0) FROM users WHERE id IN (
        WITH RECURSIVE t AS (
            SELECT id FROM users WHERE id = (SELECT left_child_id FROM users WHERE id = @uid)
            UNION ALL
            SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                SELECT x.left_child_id FROM users x WHERE x.id = t.id
                UNION SELECT x.right_child_id FROM users x WHERE x.id = t.id
            )
        ) SELECT id FROM t WHERE id IS NOT NULL
    )) AS carry_after_full_match_RIGHT_only;

-- =============================================================================
-- STEP 4 — Kal team mein kitni super fee? (UI: Super panels yesterday 0|0)
-- =============================================================================
SELECT
    '4_YESTERDAY_PURCHASES' AS step,
    COUNT(*) AS super_fee_count_kal,
    COALESCE(SUM(amount), 0) AS super_fee_usd_kal
FROM wallet_transactions
WHERE type = 'super_sub_panel_fee'
  AND DATE(created_at) = @kal;

-- =============================================================================
-- STEP 5 — SIRF income wali closings (paid) — timeline
-- =============================================================================
SELECT
    '5_PAID_CLOSINGS' AS step,
    closing_date AS date,
    left_carry_in AS L_in,
    right_carry_in AS R_in,
    pairs_matched AS pairs,
    left_carry_out AS L_out,
    right_carry_out AS R_out,
    payout_usd AS payout,
    CONCAT('Weak leg lapse: L lapsed=', left_lapsed, ' R lapsed=', right_lapsed) AS lapse_note
FROM binary_daily_closings
WHERE user_id = @uid
  AND scope = 'super'
  AND payout_usd > 0
ORDER BY closing_date;

-- =============================================================================
-- STEP 6 — Kal / beech ki sab closings ($0 bhi) — duplicate dikhegi
-- =============================================================================
SELECT
    '6_ALL_CLOSINGS' AS step,
    id AS closing_row_id,
    closing_date AS date,
    left_carry_in AS L_in,
    right_carry_in AS R_in,
    pairs_matched AS pairs,
    left_carry_out AS L_out,
    right_carry_out AS R_out,
    payout_usd AS payout
FROM binary_daily_closings
WHERE user_id = @uid
  AND scope = 'super'
ORDER BY closing_date DESC, id DESC;

-- =============================================================================
-- STEP 7 — 51 vs 33 ek saath (samajhne ke liye)
-- =============================================================================
SELECT
    '7_COMPARE' AS step,
    u.super_panel_match_carry_right AS abhi_stored_R_33_jaisa,
    (SELECT right_carry_out FROM binary_daily_closings
     WHERE user_id = @uid AND scope = 'super' AND closing_date = @kal
     ORDER BY id DESC LIMIT 1) AS kal_closing_R_out,
    (SELECT right_carry_in FROM binary_daily_closings
     WHERE user_id = @uid AND scope = 'super' AND closing_date = @kal
     ORDER BY id DESC LIMIT 1) AS kal_closing_R_in,
    '51 = team 80-29 (UI total row)' AS note_51,
    '33 = users.super_panel_match_carry_right + kal 0|33 closing' AS note_33;

-- =============================================================================
-- STEP 8 — Paid closing ke baad math check (19-May example)
-- =============================================================================
SELECT
    '8_MATH_19MAY' AS step,
    28 AS L_in,
    41 AS R_in,
    20 AS pairs_matched,
    28 - 20 AS L_minus_pairs,
    41 - 20 AS R_minus_pairs,
    'DB shows L_out=8, R_out=21 (weak-leg rule alag ho sakta hai)' AS note;

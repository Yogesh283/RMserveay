-- =============================================================================
-- PREVIEW ONLY — closing RUN mat karo. Sirf dekho: kisko kitna income + kyun.
-- Active / Sub / Super: sirf @closing_date ki purchases (cron jaisa = kal).
-- phpMyAdmin: poori file select karke Execute (2 result tables).
-- =============================================================================
SET @closing_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY);
-- SET @closing_date = '2026-05-20';

WITH RECURSIVE today_events AS (
    SELECT
        wt.user_id AS buyer_id,
        CASE wt.type
            WHEN 'minimum_panel_fee' THEN 'active_panel'
            WHEN 'sub_panel_fee' THEN 'panel'
            WHEN 'super_sub_panel_fee' THEN 'super'
        END AS scope
    FROM wallet_transactions wt
    WHERE wt.type IN ('minimum_panel_fee', 'sub_panel_fee', 'super_sub_panel_fee')
      AND DATE(wt.created_at) = @closing_date
),
upline_walk AS (
    SELECT
        e.scope,
        e.buyer_id,
        c.binary_parent_id AS ancestor_id,
        LOWER(c.binary_side) AS leg
    FROM today_events e
    JOIN users c ON c.id = e.buyer_id
    WHERE c.binary_parent_id IS NOT NULL

    UNION ALL

    SELECT
        w.scope,
        w.buyer_id,
        c.binary_parent_id,
        LOWER(c.binary_side)
    FROM upline_walk w
    JOIN users c ON c.id = w.ancestor_id
    WHERE c.binary_parent_id IS NOT NULL
),
daily_carry AS (
    SELECT
        scope,
        ancestor_id AS user_id,
        SUM(CASE WHEN leg = 'left' THEN 1 ELSE 0 END) AS left_today,
        SUM(CASE WHEN leg = 'right' THEN 1 ELSE 0 END) AS right_today
    FROM upline_walk
    WHERE ancestor_id IS NOT NULL
    GROUP BY scope, ancestor_id
),
pairs_calc AS (
    SELECT
        scope,
        user_id,
        left_today,
        right_today,
        LEAST(left_today, right_today, 20) AS pairs_match
    FROM daily_carry
    WHERE left_today > 0 OR right_today > 0
),
income_calc AS (
    SELECT
        p.scope,
        p.user_id,
        p.left_today,
        p.right_today,
        p.pairs_match,
        CASE
            WHEN p.scope = 'active_panel' THEN p.pairs_match * 1.00
            WHEN p.scope = 'panel' THEN
                CASE
                    WHEN p.pairs_match >= 256 THEN 256
                    WHEN p.pairs_match >= 128 THEN 128
                    WHEN p.pairs_match >= 64 THEN 64
                    WHEN p.pairs_match >= 32 THEN 32
                    WHEN p.pairs_match >= 16 THEN 16
                    WHEN p.pairs_match >= 8 THEN 8
                    WHEN p.pairs_match >= 4 THEN 4
                    WHEN p.pairs_match >= 2 THEN 2
                    ELSE 0
                END
            WHEN p.scope = 'super' THEN
                (CASE
                    WHEN p.pairs_match >= 256 THEN 256
                    WHEN p.pairs_match >= 128 THEN 128
                    WHEN p.pairs_match >= 64 THEN 64
                    WHEN p.pairs_match >= 32 THEN 32
                    WHEN p.pairs_match >= 16 THEN 16
                    WHEN p.pairs_match >= 8 THEN 8
                    WHEN p.pairs_match >= 4 THEN 4
                    WHEN p.pairs_match >= 2 THEN 2
                    ELSE 0
                END) * 10
            ELSE 0
        END AS income_usd,
        CASE
            WHEN p.scope IN ('panel', 'super') THEN
                CASE
                    WHEN p.pairs_match >= 256 THEN 256
                    WHEN p.pairs_match >= 128 THEN 128
                    WHEN p.pairs_match >= 64 THEN 64
                    WHEN p.pairs_match >= 32 THEN 32
                    WHEN p.pairs_match >= 16 THEN 16
                    WHEN p.pairs_match >= 8 THEN 8
                    WHEN p.pairs_match >= 4 THEN 4
                    WHEN p.pairs_match >= 2 THEN 2
                    ELSE 0
                END
            ELSE 0
        END AS milestone_tier
    FROM pairs_calc p
    JOIN users u ON u.id = p.user_id
    WHERE p.pairs_match > 0
      AND (
          p.scope = 'active_panel'
          OR (
              p.scope = 'panel'
              AND u.activation_fee_paid_at IS NOT NULL
              AND u.minimum_panel_fee_paid_at IS NOT NULL
          )
          OR p.scope = 'super'
      )
)
SELECT
    @closing_date AS closing_date,
    i.scope,
    i.user_id,
    u.login_uid AS user_login_uid,
    u.name,
    i.left_today,
    i.right_today,
    i.pairs_match,
    i.milestone_tier,
    ROUND(i.income_usd, 2) AS income_usd,
    CASE i.scope
        WHEN 'active_panel' THEN CONCAT(
            'Aaj team se L=', i.left_today, ' R=', i.right_today,
            ' → ', i.pairs_match, ' pair × $1'
        )
        WHEN 'panel' THEN CONCAT(
            'Aaj sub-panel buys L=', i.left_today, ' R=', i.right_today,
            ' → ', i.pairs_match, ' pair, milestone tier ', i.milestone_tier, ' = $', i.milestone_tier
        )
        WHEN 'super' THEN CONCAT(
            'Aaj super-sub buys L=', i.left_today, ' R=', i.right_today,
            ' → ', i.pairs_match, ' pair, milestone ', i.milestone_tier, ' × $10 = $', ROUND(i.income_usd, 2)
        )
    END AS kyo_income_jayegi
FROM income_calc i
JOIN users u ON u.id = i.user_id
WHERE i.income_usd > 0
ORDER BY i.income_usd DESC, i.scope, i.user_id;

-- Total (same preview)
WITH RECURSIVE today_events AS (
    SELECT wt.user_id AS buyer_id,
        CASE wt.type
            WHEN 'minimum_panel_fee' THEN 'active_panel'
            WHEN 'sub_panel_fee' THEN 'panel'
            WHEN 'super_sub_panel_fee' THEN 'super'
        END AS scope
    FROM wallet_transactions wt
    WHERE wt.type IN ('minimum_panel_fee', 'sub_panel_fee', 'super_sub_panel_fee')
      AND DATE(wt.created_at) = @closing_date
),
upline_walk AS (
    SELECT e.scope, e.buyer_id, c.binary_parent_id AS ancestor_id, LOWER(c.binary_side) AS leg
    FROM today_events e
    JOIN users c ON c.id = e.buyer_id
    WHERE c.binary_parent_id IS NOT NULL
    UNION ALL
    SELECT w.scope, w.buyer_id, c.binary_parent_id, LOWER(c.binary_side)
    FROM upline_walk w
    JOIN users c ON c.id = w.ancestor_id
    WHERE c.binary_parent_id IS NOT NULL
),
daily_carry AS (
    SELECT scope, ancestor_id AS user_id,
        SUM(CASE WHEN leg = 'left' THEN 1 ELSE 0 END) AS left_today,
        SUM(CASE WHEN leg = 'right' THEN 1 ELSE 0 END) AS right_today
    FROM upline_walk
    WHERE ancestor_id IS NOT NULL
    GROUP BY scope, ancestor_id
),
pairs_calc AS (
    SELECT scope, user_id, LEAST(left_today, right_today, 20) AS pairs_match
    FROM daily_carry
    WHERE left_today > 0 OR right_today > 0
),
income_calc AS (
    SELECT p.scope, p.user_id, p.pairs_match,
        CASE
            WHEN p.scope = 'active_panel' THEN p.pairs_match * 1.00
            WHEN p.scope = 'panel' THEN CASE
                WHEN p.pairs_match >= 256 THEN 256 WHEN p.pairs_match >= 128 THEN 128
                WHEN p.pairs_match >= 64 THEN 64 WHEN p.pairs_match >= 32 THEN 32
                WHEN p.pairs_match >= 16 THEN 16 WHEN p.pairs_match >= 8 THEN 8
                WHEN p.pairs_match >= 4 THEN 4 WHEN p.pairs_match >= 2 THEN 2 ELSE 0 END
            WHEN p.scope = 'super' THEN (CASE
                WHEN p.pairs_match >= 256 THEN 256 WHEN p.pairs_match >= 128 THEN 128
                WHEN p.pairs_match >= 64 THEN 64 WHEN p.pairs_match >= 32 THEN 32
                WHEN p.pairs_match >= 16 THEN 16 WHEN p.pairs_match >= 8 THEN 8
                WHEN p.pairs_match >= 4 THEN 4 WHEN p.pairs_match >= 2 THEN 2 ELSE 0 END) * 10
            ELSE 0
        END AS income_usd
    FROM pairs_calc p
    JOIN users u ON u.id = p.user_id
    WHERE p.pairs_match > 0
      AND (p.scope = 'active_panel'
           OR (p.scope = 'panel' AND u.activation_fee_paid_at IS NOT NULL AND u.minimum_panel_fee_paid_at IS NOT NULL)
           OR p.scope = 'super')
)
SELECT
    @closing_date AS closing_date,
    scope,
    COUNT(*) AS users_count,
    SUM(pairs_match) AS total_pairs,
    ROUND(SUM(income_usd), 2) AS total_income_usd
FROM income_calc
WHERE income_usd > 0
GROUP BY scope WITH ROLLUP;

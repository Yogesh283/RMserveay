-- =============================================================================
-- Aaj ki volume — Active / Sub / Super (L|R) + stored carry — EK ROW
-- SET @uid / @day badlo, phir sirf last SELECT chalao
-- =============================================================================
SET @uid = 128;
SET @day = CURDATE();   -- aaj | kal: DATE_SUB(CURDATE(), INTERVAL 1 DAY)

SELECT
    u.id AS user_id,
    u.login_uid,
    @day AS din,

    CONCAT(
        COALESCE((SELECT COUNT(*) FROM users x
            WHERE DATE(x.minimum_panel_fee_paid_at) = @day
              AND x.id IN (
                WITH RECURSIVE t AS (
                    SELECT id FROM users WHERE id = u.left_child_id
                    UNION ALL
                    SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                        SELECT z.left_child_id FROM users z WHERE z.id = t.id
                        UNION SELECT z.right_child_id FROM users z WHERE z.id = t.id
                    )
                ) SELECT id FROM t WHERE id IS NOT NULL
            )), 0),
        '|',
        COALESCE((SELECT COUNT(*) FROM users x
            WHERE DATE(x.minimum_panel_fee_paid_at) = @day
              AND x.id IN (
                WITH RECURSIVE t AS (
                    SELECT id FROM users WHERE id = u.right_child_id
                    UNION ALL
                    SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                        SELECT z.left_child_id FROM users z WHERE z.id = t.id
                        UNION SELECT z.right_child_id FROM users z WHERE z.id = t.id
                    )
                ) SELECT id FROM t WHERE id IS NOT NULL
            )), 0)
    ) AS active_aaj_L_R,

    CONCAT(
        COALESCE((SELECT COUNT(*) FROM wallet_transactions wt
            WHERE wt.type = 'sub_panel_fee' AND DATE(wt.created_at) = @day
              AND wt.user_id IN (
                WITH RECURSIVE t AS (
                    SELECT id FROM users WHERE id = u.left_child_id
                    UNION ALL
                    SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                        SELECT z.left_child_id FROM users z WHERE z.id = t.id
                        UNION SELECT z.right_child_id FROM users z WHERE z.id = t.id
                    )
                ) SELECT id FROM t WHERE id IS NOT NULL
            )), 0),
        '|',
        COALESCE((SELECT COUNT(*) FROM wallet_transactions wt
            WHERE wt.type = 'sub_panel_fee' AND DATE(wt.created_at) = @day
              AND wt.user_id IN (
                WITH RECURSIVE t AS (
                    SELECT id FROM users WHERE id = u.right_child_id
                    UNION ALL
                    SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                        SELECT z.left_child_id FROM users z WHERE z.id = t.id
                        UNION SELECT z.right_child_id FROM users z WHERE z.id = t.id
                    )
                ) SELECT id FROM t WHERE id IS NOT NULL
            )), 0)
    ) AS sub_aaj_L_R,

    CONCAT(
        COALESCE((SELECT COUNT(*) FROM wallet_transactions wt
            WHERE wt.type = 'super_sub_panel_fee' AND DATE(wt.created_at) = @day
              AND wt.user_id IN (
                WITH RECURSIVE t AS (
                    SELECT id FROM users WHERE id = u.left_child_id
                    UNION ALL
                    SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                        SELECT z.left_child_id FROM users z WHERE z.id = t.id
                        UNION SELECT z.right_child_id FROM users z WHERE z.id = t.id
                    )
                ) SELECT id FROM t WHERE id IS NOT NULL
            )), 0),
        '|',
        COALESCE((SELECT COUNT(*) FROM wallet_transactions wt
            WHERE wt.type = 'super_sub_panel_fee' AND DATE(wt.created_at) = @day
              AND wt.user_id IN (
                WITH RECURSIVE t AS (
                    SELECT id FROM users WHERE id = u.right_child_id
                    UNION ALL
                    SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                        SELECT z.left_child_id FROM users z WHERE z.id = t.id
                        UNION SELECT z.right_child_id FROM users z WHERE z.id = t.id
                    )
                ) SELECT id FROM t WHERE id IS NOT NULL
            )), 0)
    ) AS super_aaj_L_R,

    CONCAT(u.active_panel_match_carry_left, '|', u.active_panel_match_carry_right) AS active_carry_abhi,
    CONCAT(u.panel_match_carry_left, '|', u.panel_match_carry_right) AS sub_carry_abhi,
    CONCAT(u.super_panel_match_carry_left, '|', u.super_panel_match_carry_right) AS super_carry_abhi

FROM users u
WHERE u.id = @uid;

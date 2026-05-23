-- USER 157 — Super panel: SAHI SQL (Left alag, Right alag)
-- Galat: poori team ek saath + binary_side (wo parent ke niche side hai, 157 ke leg nahi)

SET @uid = 157;

-- 1) LEFT leg — sirf left_child se neeche (UI Total super LEFT)
SELECT u.id, u.login_uid, u.super_sub_panel_count
FROM users u
WHERE u.super_sub_panel_count > 0
  AND u.id IN (
    WITH RECURSIVE tree AS (
        SELECT id FROM users WHERE id = (SELECT left_child_id FROM users WHERE id = @uid)
        UNION ALL
        SELECT c.id FROM users c
        INNER JOIN tree t ON c.id IN (
            SELECT left_child_id FROM users WHERE id = t.id
            UNION ALL
            SELECT right_child_id FROM users WHERE id = t.id
        )
    )
    SELECT id FROM tree WHERE id IS NOT NULL
)
ORDER BY u.id;

SELECT 'LEFT_SUM' AS label, COALESCE(SUM(u.super_sub_panel_count), 0) AS super_panels
FROM users u
WHERE u.id IN (
    WITH RECURSIVE tree AS (
        SELECT id FROM users WHERE id = (SELECT left_child_id FROM users WHERE id = @uid)
        UNION ALL
        SELECT c.id FROM users c
        INNER JOIN tree t ON c.id IN (
            SELECT left_child_id FROM users WHERE id = t.id
            UNION ALL
            SELECT right_child_id FROM users WHERE id = t.id
        )
    )
    SELECT id FROM tree
);

-- 2) RIGHT leg — sirf right_child se neeche (UI Total super RIGHT)
SELECT u.id, u.login_uid, u.super_sub_panel_count
FROM users u
WHERE u.super_sub_panel_count > 0
  AND u.id IN (
    WITH RECURSIVE tree AS (
        SELECT id FROM users WHERE id = (SELECT right_child_id FROM users WHERE id = @uid)
        UNION ALL
        SELECT c.id FROM users c
        INNER JOIN tree t ON c.id IN (
            SELECT left_child_id FROM users WHERE id = t.id
            UNION ALL
            SELECT right_child_id FROM users WHERE id = t.id
        )
    )
    SELECT id FROM tree WHERE id IS NOT NULL
)
ORDER BY u.id;

SELECT 'RIGHT_SUM' AS label, COALESCE(SUM(u.super_sub_panel_count), 0) AS super_panels
FROM users u
WHERE u.id IN (
    WITH RECURSIVE tree AS (
        SELECT id FROM users WHERE id = (SELECT right_child_id FROM users WHERE id = @uid)
        UNION ALL
        SELECT c.id FROM users c
        INNER JOIN tree t ON c.id IN (
            SELECT left_child_id FROM users WHERE id = t.id
            UNION ALL
            SELECT right_child_id FROM users WHERE id = t.id
        )
    )
    SELECT id FROM tree
);

-- 3) 157 carry + closing
SELECT id, login_uid, super_sub_panel_count,
       super_panel_match_carry_left, super_panel_match_carry_right
FROM users WHERE id = @uid;

SELECT closing_date, left_carry_in, right_carry_in, left_carry_out, right_carry_out, payout_usd
FROM binary_daily_closings
WHERE user_id = @uid AND scope = 'super'
ORDER BY closing_date DESC LIMIT 3;

-- USER 128 — Super Panel Left/Right (UI rows verify)
-- Local + live dono par chalao; screenshot se compare karo

SET @uid = 128;
SET @aaj = '2026-05-22';
SET @kal = '2026-05-21';

-- A) User + stored carry
SELECT id, login_uid,
       super_sub_panel_count AS apne_super,
       super_panel_match_carry_left AS carry_L,
       super_panel_match_carry_right AS carry_R
FROM users WHERE id = @uid;

-- B) Total super L/R (team page row 1) = SUM(super_sub_panel_count) per leg
SELECT 'LEFT_TOTAL' AS row_name,
       COALESCE(SUM(u.super_sub_panel_count), 0) AS val
FROM users u
WHERE u.id IN (
    WITH RECURSIVE t AS (
        SELECT id FROM users WHERE id = (SELECT left_child_id FROM users WHERE id = @uid)
        UNION ALL
        SELECT c.id FROM users c
        INNER JOIN t ON c.id IN (
            SELECT x.left_child_id FROM users x WHERE x.id = t.id
            UNION ALL SELECT x.right_child_id FROM users x WHERE x.id = t.id
        )
    ) SELECT id FROM t
) AND LOWER(u.email) NOT LIKE '%@dummy.test'
UNION ALL
SELECT 'RIGHT_TOTAL',
       COALESCE(SUM(u.super_sub_panel_count), 0)
FROM users u
WHERE u.id IN (
    WITH RECURSIVE t AS (
        SELECT id FROM users WHERE id = (SELECT right_child_id FROM users WHERE id = @uid)
        UNION ALL
        SELECT c.id FROM users c
        INNER JOIN t ON c.id IN (
            SELECT x.left_child_id FROM users x WHERE x.id = t.id
            UNION ALL SELECT x.right_child_id FROM users x WHERE x.id = t.id
        )
    ) SELECT id FROM t
) AND LOWER(u.email) NOT LIKE '%@dummy.test';

-- C) Today new (super $100 fee count that day per leg)
SELECT
    leg,
    COUNT(*) AS today_new
FROM (
    SELECT 'LEFT' AS leg, wt.id
    FROM wallet_transactions wt
    WHERE wt.type = 'super_sub_panel_fee'
      AND DATE(wt.created_at) = @aaj
      AND wt.user_id IN (
          WITH RECURSIVE t AS (
              SELECT id FROM users WHERE id = (SELECT left_child_id FROM users WHERE id = @uid)
              UNION ALL
              SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                  SELECT x.left_child_id FROM users x WHERE x.id = t.id
                  UNION ALL SELECT x.right_child_id FROM users x WHERE x.id = t.id
              )
          ) SELECT id FROM t
      )
    UNION ALL
    SELECT 'RIGHT', wt.id
    FROM wallet_transactions wt
    WHERE wt.type = 'super_sub_panel_fee'
      AND DATE(wt.created_at) = @aaj
      AND wt.user_id IN (
          WITH RECURSIVE t AS (
              SELECT id FROM users WHERE id = (SELECT right_child_id FROM users WHERE id = @uid)
              UNION ALL
              SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                  SELECT x.left_child_id FROM users x WHERE x.id = t.id
                  UNION ALL SELECT x.right_child_id FROM users x WHERE x.id = t.id
              )
          ) SELECT id FROM t
      )
) x
GROUP BY leg;

-- D) Carry forward (closing + users)
SELECT closing_date, left_carry_in AS L_in, right_carry_in AS R_in,
       left_carry_out AS L_out, right_carry_out AS R_out, payout_usd
FROM binary_daily_closings
WHERE user_id = @uid AND scope = 'super'
ORDER BY closing_date DESC, id DESC
LIMIT 5;

-- E) UI math check (carry forward = total_L + today_new_L | total_R)
SELECT
    (SELECT COALESCE(SUM(u.super_sub_panel_count), 0) FROM users u
     WHERE u.id IN (
         WITH RECURSIVE t AS (
             SELECT id FROM users WHERE id = (SELECT left_child_id FROM users WHERE id = @uid)
             UNION ALL SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                 SELECT x.left_child_id FROM users x WHERE x.id = t.id
                 UNION ALL SELECT x.right_child_id FROM users x WHERE x.id = t.id
             )
         ) SELECT id FROM t
     ) AND LOWER(u.email) NOT LIKE '%@dummy.test') AS total_L,
    (SELECT COALESCE(SUM(u.super_sub_panel_count), 0) FROM users u
     WHERE u.id IN (
         WITH RECURSIVE t AS (
             SELECT id FROM users WHERE id = (SELECT right_child_id FROM users WHERE id = @uid)
             UNION ALL SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                 SELECT x.left_child_id FROM users x WHERE x.id = t.id
                 UNION ALL SELECT x.right_child_id FROM users x WHERE x.id = t.id
             )
         ) SELECT id FROM t
     ) AND LOWER(u.email) NOT LIKE '%@dummy.test') AS total_R,
    (SELECT COUNT(*) FROM wallet_transactions wt
     WHERE wt.type = 'super_sub_panel_fee' AND DATE(wt.created_at) = @aaj
       AND wt.user_id IN (
           WITH RECURSIVE t AS (
               SELECT id FROM users WHERE id = (SELECT left_child_id FROM users WHERE id = @uid)
               UNION ALL SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                   SELECT x.left_child_id FROM users x WHERE x.id = t.id
                   UNION ALL SELECT x.right_child_id FROM users x WHERE x.id = t.id
               )
           ) SELECT id FROM t)) AS today_new_L,
    (SELECT COUNT(*) FROM wallet_transactions wt
     WHERE wt.type = 'super_sub_panel_fee' AND DATE(wt.created_at) = @aaj
       AND wt.user_id IN (
           WITH RECURSIVE t AS (
               SELECT id FROM users WHERE id = (SELECT right_child_id FROM users WHERE id = @uid)
               UNION ALL SELECT c.id FROM users c INNER JOIN t ON c.id IN (
                   SELECT x.left_child_id FROM users x WHERE x.id = t.id
                   UNION ALL SELECT x.right_child_id FROM users x WHERE x.id = t.id
               )
           ) SELECT id FROM t)) AS today_new_R;

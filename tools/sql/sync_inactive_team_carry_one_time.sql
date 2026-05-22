-- =============================================================================
-- ONE-TIME (optional): team page carry for users who already got closing income
-- but should show HELD carry (left_out = left_in) on closing rows.
--
-- Prefer the PHP tool (uses live ledger math for users.* columns):
--   php tools/sync_inactive_team_carry_display.php --dry
--   php tools/sync_inactive_team_carry_display.php
--
-- This SQL only fixes binary_daily_closings.carry_out where carry_in still has
-- the full bucket. It does NOT recalc subtree volume. Wallet / payout untouched.
-- =============================================================================

-- Preview rows that would change
SELECT b.id, b.user_id, b.scope, b.closing_date,
       b.left_carry_in, b.right_carry_in,
       b.left_carry_out, b.right_carry_out,
       b.pairs_matched, b.payout_usd
FROM binary_daily_closings b
WHERE (b.left_carry_out <> b.left_carry_in OR b.right_carry_out <> b.right_carry_in)
  AND b.left_carry_in > 0 AND b.right_carry_in > 0
ORDER BY b.closing_date DESC, b.id DESC
LIMIT 50;

-- Apply (uncomment after review):
/*
START TRANSACTION;

UPDATE binary_daily_closings b
SET
    b.left_carry_out = b.left_carry_in,
    b.right_carry_out = b.right_carry_in,
    b.left_lapsed = 0,
    b.right_lapsed = 0,
    b.meta = JSON_SET(
        COALESCE(b.meta, JSON_OBJECT()),
        '$.team_display_carry_sync', DATE_FORMAT(NOW(), '%Y-%m-%d'),
        '$.income_eligible', false,
        '$.pairs_held', LEAST(b.left_carry_in, b.right_carry_in)
    )
WHERE (b.left_carry_out <> b.left_carry_in OR b.right_carry_out <> b.right_carry_in)
  AND b.left_carry_in > 0 AND b.right_carry_in > 0;

COMMIT;
*/

-- Sync users.panel / active / super carry from latest closing carry_out (after above):
/*
UPDATE users u
JOIN (
    SELECT user_id, scope,
           SUBSTRING_INDEX(GROUP_CONCAT(id ORDER BY closing_date DESC, id DESC), ',', 1) AS last_id
    FROM binary_daily_closings
    GROUP BY user_id, scope
) x ON x.user_id = u.id
JOIN binary_daily_closings c ON c.id = x.last_id
SET
    u.panel_match_carry_left = CASE WHEN c.scope = 'panel' THEN c.left_carry_out ELSE u.panel_match_carry_left END,
    u.panel_match_carry_right = CASE WHEN c.scope = 'panel' THEN c.right_carry_out ELSE u.panel_match_carry_right END,
    u.active_panel_match_carry_left = CASE WHEN c.scope = 'active_panel' THEN c.left_carry_out ELSE u.active_panel_match_carry_left END,
    u.active_panel_match_carry_right = CASE WHEN c.scope = 'active_panel' THEN c.right_carry_out ELSE u.active_panel_match_carry_right END,
    u.super_panel_match_carry_left = CASE WHEN c.scope = 'super' THEN c.left_carry_out ELSE u.super_panel_match_carry_left END,
    u.super_panel_match_carry_right = CASE WHEN c.scope = 'super' THEN c.right_carry_out ELSE u.super_panel_match_carry_right END;
*/

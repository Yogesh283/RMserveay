-- =============================================================================
-- User 157 — Sub panel: match, carry, kal payout (READ ONLY)
-- =============================================================================
SET @user_id = 157;
SET @closing_date = '2026-05-21';  -- kal; zarurat ho to badlo

-- A) Stored carry (purana binary bucket — 43|223 jaisa galat UI isse aa raha tha)
SELECT
    id,
    login_uid,
    panel_match_carry_left AS stored_L,
    panel_match_carry_right AS stored_R,
    sub_panel_count
FROM users
WHERE id = @user_id;

-- B) Binary children
SELECT id, login_uid, left_child_id, right_child_id
FROM users
WHERE id = @user_id;

-- C) Kal ki sub_panel_fee (poori team — buyer user_id)
SELECT wt.user_id, u.login_uid, wt.amount, wt.created_at
FROM wallet_transactions wt
JOIN users u ON u.id = wt.user_id
WHERE wt.type = 'sub_panel_fee'
  AND DATE(wt.created_at) = @closing_date
  AND wt.user_id IN (
      SELECT id FROM users WHERE id = @user_id
      UNION
      -- direct children ke ids manually add karo agar chaho; ya app team API dekho
      SELECT left_child_id FROM users WHERE id = @user_id AND left_child_id IS NOT NULL
      UNION
      SELECT right_child_id FROM users WHERE id = @user_id AND right_child_id IS NOT NULL
  )
ORDER BY wt.created_at;

-- D) Closing record (sahi hona chahiye: in 9|180, pairs 9, out 0|171, payout 8)
SELECT
    closing_date,
    left_carry_in,
    right_carry_in,
    pairs_matched,
    left_carry_out,
    right_carry_out,
    payout_usd,
    left_lapsed,
    right_lapsed,
    meta
FROM binary_daily_closings
WHERE user_id = @user_id
  AND scope = 'panel'
  AND closing_date = @closing_date;

-- E) Expected (app logic ab subtree se):
--    Total sub L+R = 63 + 243 → match 63 → carry forward 0 | 180
--    Kal L=9, R=0 → match input 9 | 180 → pairs 9 → payout $8 → carry 0 | 171

-- F) Team page API check (browser): GET /api/member/team/overview (logged in as 157)
--    leg_match.panel.yesterday_match_left  = 9
--    leg_match.panel.yesterday_match_right = 180
--    leg_match.panel.pairs_matched         = 9
--    leg_match.panel.carry_forward_right   = 171

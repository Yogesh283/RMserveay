-- =============================================================================
-- Active panel check — ek calendar date (default: 2026-05-21)
-- phpMyAdmin: SET chalao, phir baaki queries alag-alag ya poori file
-- =============================================================================
SET @check_date = '2026-05-21';

-- ---------------------------------------------------------------------------
-- 1) SUMMARY — 21 ko kitne naye active panel (sabse important)
-- ---------------------------------------------------------------------------
SELECT
    @check_date AS check_date,
    (SELECT COUNT(*)
     FROM users
     WHERE DATE(minimum_panel_fee_paid_at) = @check_date) AS naye_active_panel_users,
    (SELECT COUNT(*)
     FROM wallet_transactions
     WHERE type = 'minimum_panel_fee'
       AND DATE(created_at) = @check_date) AS minimum_panel_fee_tx_count,
    (SELECT COUNT(DISTINCT user_id)
     FROM wallet_transactions
     WHERE type = 'minimum_panel_fee'
       AND DATE(created_at) = @check_date) AS alag_users_ne_fee_pay_ki,
    (SELECT COUNT(*)
     FROM active_panel_users
     WHERE DATE(activated_at) = @check_date) AS active_panel_users_table_naye,
    (SELECT COUNT(*)
     FROM users
     WHERE minimum_panel_fee_paid_at IS NOT NULL
       AND DATE(minimum_panel_fee_paid_at) <= @check_date) AS total_active_panel_tak_us_date;

-- ---------------------------------------------------------------------------
-- 2) LIST — 21 ko kaun-kaun active panel bana (login, name, time)
-- ---------------------------------------------------------------------------
SELECT
    u.id,
    u.login_uid,
    u.name,
    u.minimum_panel_fee_paid_at,
    apu.activated_at,
    apu.total_paid_usd
FROM users u
LEFT JOIN active_panel_users apu ON apu.user_id = u.id
WHERE DATE(u.minimum_panel_fee_paid_at) = @check_date
ORDER BY u.minimum_panel_fee_paid_at;

-- ---------------------------------------------------------------------------
-- 3) Wallet ledger — 21 ki minimum_panel_fee transactions
-- ---------------------------------------------------------------------------
SELECT
    wt.id,
    wt.user_id,
    u.login_uid,
    u.name,
    wt.amount,
    wt.created_at,
    wt.balance_after
FROM wallet_transactions wt
JOIN users u ON u.id = wt.user_id
WHERE wt.type = 'minimum_panel_fee'
  AND DATE(wt.created_at) = @check_date
ORDER BY wt.created_at;

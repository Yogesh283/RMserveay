-- User 157 — 22-May-2026 sub panel: left / right kitne points (MySQL 8+)
SET @user_id = 157;
SET @closing_date = '2026-05-22';

WITH RECURSIVE purchases AS (
    SELECT wt.id AS tx_id, wt.user_id AS buyer_id
    FROM wallet_transactions wt
    WHERE wt.type = 'sub_panel_fee'
      AND DATE(wt.created_at) = @closing_date
),
walk AS (
    SELECT
        p.tx_id,
        p.buyer_id,
        u.binary_parent_id AS parent_id,
        LOWER(TRIM(u.binary_side)) AS side_to_parent,
        0 AS depth
    FROM purchases p
    INNER JOIN users u ON u.id = p.buyer_id
    WHERE u.binary_parent_id IS NOT NULL

    UNION ALL

    SELECT
        w.tx_id,
        w.buyer_id,
        u.binary_parent_id,
        LOWER(TRIM(u.binary_side)),
        w.depth + 1
    FROM walk w
    INNER JOIN users u ON u.id = w.parent_id
    WHERE w.parent_id <> @user_id
      AND w.depth < 100
)
SELECT
    @user_id AS user_id,
    @closing_date AS closing_date,
    COALESCE(SUM(CASE WHEN h.side_to_parent = 'left' THEN 1 ELSE 0 END), 0) AS sub_left,
    COALESCE(SUM(CASE WHEN h.side_to_parent = 'right' THEN 1 ELSE 0 END), 0) AS sub_right,
    LEAST(
        COALESCE(SUM(CASE WHEN h.side_to_parent = 'left' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN h.side_to_parent = 'right' THEN 1 ELSE 0 END), 0)
    ) AS pairs_matched
FROM walk h
WHERE h.parent_id = @user_id
  AND h.side_to_parent IN ('left', 'right');

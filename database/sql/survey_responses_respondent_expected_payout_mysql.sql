-- =============================================================================
-- survey_responses — respondent reward + EXPECTED wallet date (respondent_payout_at)
-- =============================================================================
-- Matches Laravel: 2026_05_05_200000_add_respondent_payout_fields_to_survey_responses_table.php
--
-- respondent_payout_at  → expected datetime when member wallet should be credited
--                         (app sets this from completion time + delay days)
-- respondent_payout_wallet_tx_id → filled when payout command posts to wallet
--
-- Prefer:  php artisan migrate
-- Use this file only for manual MySQL/MariaDB (phpMyAdmin, etc.).
--
-- If you see "Duplicate column name", columns are already there — skip that ALTER.
-- =============================================================================

ALTER TABLE `survey_responses`
    ADD COLUMN `respondent_reward_usd` DECIMAL(14, 2) NULL DEFAULT NULL COMMENT 'USDT for respondent' AFTER `completion_time_sec`;

ALTER TABLE `survey_responses`
    ADD COLUMN `respondent_payout_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Expected wallet credit datetime' AFTER `respondent_reward_usd`;

ALTER TABLE `survey_responses`
    ADD COLUMN `respondent_payout_wallet_tx_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT 'wallet_transactions.id when paid' AFTER `respondent_payout_at`;

-- Index for cron: find due payouts where wallet tx not yet set
CREATE INDEX `survey_responses_payout_due_idx`
    ON `survey_responses` (`respondent_payout_at`, `respondent_payout_wallet_tx_id`);

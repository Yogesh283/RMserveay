<?php

namespace App\Console\Commands;

use App\Models\BinaryDailyClosing;
use App\Models\MatchingPayout;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Backfill matching_payouts from binary_daily_closings.
 *
 * Walks every binary_daily_closings row with payout_usd > 0 and creates the
 * matching_payouts row (idempotent via unique (user_id, scope, closing_date)).
 *
 * Use after deploying the migration so historical paid users show up in the
 * payouts table without waiting for a fresh closing run.
 *
 * Usage:
 *   php artisan binary:backfill-matching-payouts --dry
 *   php artisan binary:backfill-matching-payouts
 *   php artisan binary:backfill-matching-payouts --scope=panel
 *   php artisan binary:backfill-matching-payouts --since=2026-05-01
 */
class BackfillMatchingPayoutsCommand extends Command
{
    protected $signature = 'binary:backfill-matching-payouts
        {--scope= : Limit to one scope: active_panel | panel | super}
        {--since= : Only backfill closing_date >= YYYY-MM-DD}
        {--dry : Preview without writing.}';

    protected $description = 'Populate matching_payouts from binary_daily_closings (paid users only).';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry');
        $scope = $this->option('scope');
        $since = $this->option('since');

        $q = BinaryDailyClosing::query()
            ->where('payout_usd', '>', 0)
            ->orderBy('id');

        if ($scope !== null && $scope !== '') {
            $q->where('scope', (string) $scope);
        }
        if ($since !== null && $since !== '') {
            $q->whereDate('closing_date', '>=', (string) $since);
        }

        $total = $q->count();
        $this->info(sprintf(
            'Backfilling matching_payouts mode=%s closings=%d scope=%s since=%s',
            $dry ? 'DRY-RUN' : 'APPLY',
            $total,
            $scope ?? 'all',
            $since ?? '-',
        ));

        if ($total === 0) {
            $this->warn('No paid closings to backfill.');

            return self::SUCCESS;
        }

        $written = 0;
        $skipped = 0;

        $q->chunkById(500, function ($chunk) use (&$written, &$skipped, $dry) {
            foreach ($chunk as $closing) {
                $milestone = $closing->meta['milestone'] ?? null;
                $lapsed = $closing->meta['milestone_lapsed_pairs'] ?? null;
                if ($lapsed === null) {
                    $lapsed = (int) $closing->left_lapsed + (int) $closing->right_lapsed;
                }

                $existing = MatchingPayout::query()
                    ->where('user_id', $closing->user_id)
                    ->where('scope', $closing->scope)
                    ->whereDate('closing_date', $closing->closing_date)
                    ->first();

                if ($existing !== null) {
                    $skipped++;

                    continue;
                }

                if ($dry) {
                    $written++;
                    $this->line(sprintf(
                        '  [DRY] user=%d scope=%s date=%s payout=$%s milestone=%s pairs=%d',
                        $closing->user_id,
                        $closing->scope,
                        $closing->closing_date,
                        (string) $closing->payout_usd,
                        $milestone === null ? '-' : $milestone,
                        (int) $closing->pairs_matched,
                    ));

                    continue;
                }

                DB::transaction(function () use ($closing, $milestone, $lapsed) {
                    MatchingPayout::query()->updateOrCreate(
                        [
                            'user_id' => $closing->user_id,
                            'scope' => $closing->scope,
                            'closing_date' => $closing->closing_date,
                        ],
                        [
                            'pairs_matched' => (int) $closing->pairs_matched,
                            'milestone' => $milestone !== null ? (int) $milestone : null,
                            'lapsed_pairs' => (int) $lapsed,
                            'payout_usd' => (string) $closing->payout_usd,
                            'balance_after_usd' => (string) $closing->balance_after_usd,
                            'binary_daily_closing_id' => $closing->id,
                            'wallet_transaction_id' => $closing->wallet_transaction_id,
                            'meta' => [
                                'backfilled_from' => 'binary_daily_closings',
                                'closing_meta' => $closing->meta,
                            ],
                        ],
                    );
                });

                $written++;
            }
        });

        $this->info(sprintf(
            'Done. written=%d skipped(existing)=%d %s',
            $written,
            $skipped,
            $dry ? '[DRY-RUN]' : '',
        ));

        return self::SUCCESS;
    }
}

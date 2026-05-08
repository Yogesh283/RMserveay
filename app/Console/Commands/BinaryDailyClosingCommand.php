<?php

namespace App\Console\Commands;

use App\Models\BinaryDailyClosing;
use App\Services\BinaryDailyClosingService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Cron entry point for the binary 1:1 daily closing.
 *
 * Examples:
 *  php artisan binary:daily-closing                                # close yesterday (IST), all scopes
 *  php artisan binary:daily-closing --date=2026-05-08              # close a specific date
 *  php artisan binary:daily-closing --scope=active_panel           # only active-panel matching ($1/pair)
 *  php artisan binary:daily-closing --scope=panel                  # only sub-panel milestone matching
 *  php artisan binary:daily-closing --scope=super                  # only super-sub-panel milestone matching
 *  php artisan binary:daily-closing --scope=active_panel --date=today
 *  php artisan binary:daily-closing --report                       # only print latest report (no work)
 */
class BinaryDailyClosingCommand extends Command
{
    protected $signature = 'binary:daily-closing
        {--date= : Closing date (YYYY-MM-DD) in the configured timezone. Use "today" for the current day. Defaults to "yesterday".}
        {--scope=* : Limit closing to specific scopes (active_panel, panel, super). Repeatable.}
        {--report : Skip processing — only print the report for the given (or latest) date.}';

    protected $description = 'Run the binary 1:1 daily closing: match pairs, credit wallets, carry leftover, lapse milestone excess.';

    public function handle(BinaryDailyClosingService $closing): int
    {
        if (! $closing->isEnabled() && ! $this->option('report')) {
            $this->warn('Binary daily closing is disabled (BINARY_CLOSING_ENABLED=false).');

            return self::SUCCESS;
        }

        $tz = $closing->timezone();
        $dateOpt = $this->option('date');
        if ($dateOpt === null || $dateOpt === '') {
            $date = Carbon::now($tz)->subDay()->startOfDay();
        } elseif (strtolower((string) $dateOpt) === 'today') {
            $date = Carbon::now($tz)->startOfDay();
        } else {
            $date = Carbon::parse($dateOpt, $tz)->startOfDay();
        }

        $scopes = (array) $this->option('scope');
        $scopes = array_values(array_filter(array_map('strval', $scopes), fn ($s) => $s !== ''));
        $scopeFilter = $scopes !== [] ? $scopes : null;

        $this->line(sprintf(
            '<info>Binary daily closing</info>  date=%s  tz=%s  cut-off=%s  scopes=%s',
            $date->toDateString(),
            $tz,
            $closing->closingTime(),
            $scopeFilter ? implode(',', $scopeFilter) : 'all',
        ));

        if (! $this->option('report')) {
            $start = microtime(true);
            $totals = $closing->closeAll($date, $scopeFilter);
            $elapsed = number_format((microtime(true) - $start) * 1000, 1);

            $this->line('');
            $this->info(sprintf(
                'Processed %d closings (%d paid). Pairs matched: %d. Total payout: $%s. (%s ms)',
                $totals['processed'],
                $totals['paid_users'],
                $totals['pairs_matched'],
                $totals['payout_usd'],
                $elapsed,
            ));

            foreach ($totals['scopes'] as $scope => $row) {
                $this->line(sprintf(
                    '  - scope=%-6s  closings=%-5d  paid=%-5d  pairs=%-6d  payout=$%s',
                    $scope,
                    $row['processed'],
                    $row['paid_users'],
                    $row['pairs_matched'],
                    $row['payout_usd'],
                ));
            }
        }

        $this->printReport($date);

        return self::SUCCESS;
    }

    private function printReport(Carbon $date): void
    {
        $rows = BinaryDailyClosing::query()
            ->where('closing_date', $date->toDateString())
            ->orderBy('scope')
            ->orderByDesc('payout_usd')
            ->limit(20)
            ->get();

        $this->line('');
        $this->line(sprintf('<info>Top 20 closings for %s</info>', $date->toDateString()));

        if ($rows->isEmpty()) {
            $this->line('  (no closings recorded)');

            return;
        }

        $this->table(
            ['User', 'Scope', 'L→', '→R', 'Pairs', 'Cap?', 'Payout', 'Carry L', 'Carry R', 'Lapsed L', 'Lapsed R'],
            $rows->map(fn (BinaryDailyClosing $r) => [
                $r->user_id,
                $r->scope,
                $r->left_carry_in,
                $r->right_carry_in,
                $r->pairs_matched,
                $r->cap_hit ? 'yes' : 'no',
                '$'.number_format((float) $r->payout_usd, 2),
                $r->left_carry_out,
                $r->right_carry_out,
                $r->left_lapsed,
                $r->right_lapsed,
            ])->all(),
        );
    }
}

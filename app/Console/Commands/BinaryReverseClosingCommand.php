<?php

namespace App\Console\Commands;

use App\Services\BinaryClosingReversalService;
use App\Services\BinaryDailyClosingService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Reverse a binary daily closing (wrong income undo).
 *
 * Examples:
 *   php artisan binary:reverse-closing --date=2026-05-20 --dry
 *   php artisan binary:reverse-closing --date=2026-05-20
 *   php artisan binary:reverse-closing --date=2026-05-20 --scope=active_panel
 */
class BinaryReverseClosingCommand extends Command
{
    protected $signature = 'binary:reverse-closing
        {--date= : Closing date to reverse (YYYY-MM-DD). Default: yesterday in closing timezone.}
        {--scope=* : Limit to scopes: active_panel, panel, super. Repeatable.}
        {--dry : Preview only — no database changes.}';

    protected $description = 'Reverse binary closing for a date: debit wallet, restore carry, delete closing rows and wallet transactions.';

    public function handle(BinaryClosingReversalService $reversal, BinaryDailyClosingService $closing): int
    {
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

        $dry = (bool) $this->option('dry');

        $this->line(sprintf(
            '<info>Binary closing reversal</info>  date=%s  tz=%s  scopes=%s  mode=%s',
            $date->toDateString(),
            $tz,
            $scopeFilter ? implode(',', $scopeFilter) : 'all',
            $dry ? 'DRY-RUN' : 'APPLY',
        ));

        if (! $dry && ! $this->confirm('This will remove closing income and delete related transactions. Continue?', true)) {
            $this->warn('Cancelled.');

            return self::SUCCESS;
        }

        $result = $reversal->reverse($date, $scopeFilter, $dry);

        $this->newLine();
        $this->table(
            ['Metric', 'Value'],
            [
                ['Closing date', $result['closing_date']],
                ['Users affected', (string) $result['users_affected']],
                ['Total reversed (USD)', $result['total_reversed_usd']],
                ['binary_daily_closings removed', (string) $result['closings_deleted']],
                ['matching_payouts removed', (string) $result['payouts_deleted']],
                ['wallet_transactions removed', (string) $result['wallet_tx_deleted']],
            ],
        );

        if ($result['users_affected'] === 0) {
            $this->warn('No paid closings found for this date. Nothing to reverse.');
        } elseif ($dry) {
            $this->info('Dry-run complete. Re-run without --dry to apply.');
        } else {
            $this->info('Reversal complete. You can run binary:daily-closing again for this date if needed.');
        }

        return self::SUCCESS;
    }
}

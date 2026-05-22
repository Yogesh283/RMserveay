<?php

namespace App\Console\Commands;

use App\Services\BinaryClosingDailyCarryService;
use App\Services\BinaryDailyClosingService;
use App\Models\WalletTransaction;
use App\Models\User;
use App\Support\BinaryClosingCalendar;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Preview who would match on a closing_date (daily ledger: both legs need points that day).
 *
 *   php artisan binary:preview-closing --date=2026-05-21
 */
class BinaryPreviewClosingCommand extends Command
{
    protected $signature = 'binary:preview-closing
        {--date= : Closing date YYYY-MM-DD (default: yesterday IST)}';

    protected $description = 'Preview daily-closing: purchases on date, upline L/R increments, who can form pairs.';

    public function handle(BinaryClosingDailyCarryService $daily, BinaryDailyClosingService $closing): int
    {
        $tz = $closing->timezone();
        $dateOpt = $this->option('date');
        $date = ($dateOpt === null || $dateOpt === '')
            ? Carbon::now($tz)->subDay()->startOfDay()
            : Carbon::parse((string) $dateOpt, $tz)->startOfDay();

        $dateStr = $date->toDateString();
        [$start, $end] = BinaryClosingCalendar::dateLocalBounds($dateStr);

        $this->line(sprintf('<info>Preview closing</info>  date=%s  tz=%s  window=%s → %s', $dateStr, $tz, $start->toDateTimeString(), $end->toDateTimeString()));
        $this->newLine();

        foreach ($closing->enabledScopes() as $scope => $cfg) {
            $txType = match ($scope) {
                'active_panel' => WalletTransaction::TYPE_MINIMUM_PANEL_FEE,
                'panel' => WalletTransaction::TYPE_SUB_PANEL_FEE,
                'super' => WalletTransaction::TYPE_SUPER_SUB_PANEL_FEE,
                default => null,
            };

            if ($txType === null) {
                continue;
            }

            $txRows = WalletTransaction::query()
                ->where('type', $txType)
                ->whereBetween('created_at', [$start, $end])
                ->count();

            $buyerIds = WalletTransaction::query()
                ->where('type', $txType)
                ->whereBetween('created_at', [$start, $end])
                ->pluck('user_id')
                ->unique()
                ->values()
                ->all();

            $inTree = 0;
            $noParent = [];
            foreach ($buyerIds as $bid) {
                $u = User::query()->whereKey($bid)->first(['id', 'binary_parent_id', 'binary_side']);
                if ($u === null) {
                    continue;
                }
                if ($u->binary_parent_id !== null) {
                    $inTree++;
                } else {
                    $noParent[] = (int) $u->id;
                }
            }

            $increments = $daily->incrementsForClosingDate($scope, $date);
            $bilateral = 0;
            $eligible = [];
            foreach ($increments as $uid => $sides) {
                $l = (int) $sides['left'];
                $r = (int) $sides['right'];
                if ($l > 0 && $r > 0) {
                    $bilateral++;
                    $eligible[] = ['user_id' => $uid, 'left' => $l, 'right' => $r, 'pairs' => min($l, $r)];
                }
            }

            usort($eligible, fn ($a, $b) => $b['pairs'] <=> $a['pairs']);

            $this->line(sprintf('<comment>scope=%s</comment>  purchases(tx)=%d  buyers=%d  in_binary_tree=%d', $scope, $txRows, count($buyerIds), $inTree));
            if ($noParent !== []) {
                $this->warn('  Buyers without binary_parent_id (no upline +1): '.implode(', ', array_slice($noParent, 0, 20)).(count($noParent) > 20 ? '…' : ''));
            }
            $this->line(sprintf('  Ancestors touched: %d  |  both legs that day (can match): <info>%d</info>', count($increments), $bilateral));

            if ($eligible !== []) {
                $this->table(
                    ['user_id', 'daily_L', 'daily_R', 'pairs_today'],
                    array_slice(array_map(fn ($r) => [$r['user_id'], $r['left'], $r['right'], $r['pairs']], $eligible), 0, 15),
                );
            } else {
                $this->warn('  No ancestor has points on BOTH left and right for this date → closing payout = 0.');
                $oneSided = [];
                foreach ($increments as $uid => $sides) {
                    $l = (int) $sides['left'];
                    $r = (int) $sides['right'];
                    if ($l > 0 || $r > 0) {
                        $oneSided[] = [$uid, $l, $r];
                    }
                }
                usort($oneSided, fn ($a, $b) => ($b[1] + $b[2]) <=> ($a[1] + $a[2]));
                if ($oneSided !== []) {
                    $this->line('  Top one-sided ancestors (sample):');
                    $this->table(['user_id', 'daily_L', 'daily_R'], array_slice($oneSided, 0, 10));
                }
            }

            $this->newLine();
        }

        return self::SUCCESS;
    }
}

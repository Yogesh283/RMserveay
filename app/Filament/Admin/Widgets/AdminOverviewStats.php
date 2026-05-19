<?php

namespace App\Filament\Admin\Widgets;

use App\Models\MatchingPayout;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Support\BinaryClosingCalendar;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class AdminOverviewStats extends StatsOverviewWidget
{
    protected static ?int $sort = 10;

    protected function getStats(): array
    {
        $tz = BinaryClosingCalendar::timezone();
        $closingYesterday = BinaryClosingCalendar::yesterdayDateString();
        $closingToday = BinaryClosingCalendar::todayDateString();

        $yesterdayPayoutTotal = (float) (MatchingPayout::query()
            ->whereDate('closing_date', $closingYesterday)
            ->sum('payout_usd') ?? 0);
        $yesterdayPayoutCount = MatchingPayout::query()
            ->whereDate('closing_date', $closingYesterday)
            ->count();

        $todayClosingPayoutTotal = (float) (MatchingPayout::query()
            ->whereDate('closing_date', $closingToday)
            ->sum('payout_usd') ?? 0);
        $todayClosingPayoutCount = MatchingPayout::query()
            ->whereDate('closing_date', $closingToday)
            ->count();

        $totalPayoutUsd = (float) (MatchingPayout::query()->sum('payout_usd') ?? 0);
        $totalUsers = User::query()->count();
        $totalDepositUsd = (float) (WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_DEPOSIT_CREDIT)
            ->sum('amount') ?? 0);

        return [
            Stat::make('Yesterday closing payout (USD)', '$'.number_format($yesterdayPayoutTotal, 2))
                ->description("{$yesterdayPayoutCount} payouts · closing date {$closingYesterday} · {$tz}")
                ->color('success'),
            Stat::make('Today closing payout (USD)', '$'.number_format($todayClosingPayoutTotal, 2))
                ->description("{$todayClosingPayoutCount} payouts · closing date {$closingToday}")
                ->color('gray'),
            Stat::make('Total payout (USD)', '$'.number_format($totalPayoutUsd, 2))
                ->description('All-time matching paid'),
            Stat::make('Total users', number_format($totalUsers)),
            Stat::make('Total deposit (USD)', '$'.number_format($totalDepositUsd, 2)),
        ];
    }
}

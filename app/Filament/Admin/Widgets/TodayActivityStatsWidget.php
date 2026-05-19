<?php

namespace App\Filament\Admin\Widgets;

use App\Filament\Admin\Resources\WalletTransactions\WalletTransactionResource;
use App\Support\AdminDashboardTodayMetrics;
use App\Support\BinaryClosingCalendar;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class TodayActivityStatsWidget extends StatsOverviewWidget
{
    protected static ?int $sort = 1;

    protected int | string | array $columnSpan = 'full';

    protected function getColumns(): int
    {
        return 4;
    }

    protected function getStats(): array
    {
        $tz = BinaryClosingCalendar::timezone();
        $date = BinaryClosingCalendar::todayDateString();
        $deposits = AdminDashboardTodayMetrics::todayDeposits();
        $panels = AdminDashboardTodayMetrics::todayPanelPurchases();
        $surveys = AdminDashboardTodayMetrics::todaySurveyActivity();

        return [
            Stat::make('Today deposits', '$'.number_format($deposits['total_usd'], 2))
                ->description("{$deposits['count']} deposit tx · {$date} · {$tz}")
                ->color('info')
                ->url(WalletTransactionResource::getUrl('index')),
            Stat::make('Active panel today', number_format($panels['active_panel']))
                ->description('IDs with $10 panel paid today')
                ->color('success'),
            Stat::make('Sub / Super today', "{$panels['sub_users']} / {$panels['super_users']} users")
                ->description("{$panels['sub_purchases']} sub · {$panels['super_purchases']} super purchases")
                ->color('warning'),
            Stat::make('Surveys completed', number_format($surveys['completions']))
                ->description(
                    $surveys['distinct_users'].' members · $'
                    .number_format($surveys['credited_usd'], 2).' survey credits today'
                )
                ->color('gray'),
        ];
    }
}

<?php

namespace App\Filament\Admin\Widgets;

use App\Filament\Admin\Resources\TodayActiveUserReports\TodayActiveUserReportResource;
use App\Filament\Admin\Resources\TodayNewUserReports\TodayNewUserReportResource;
use App\Support\AdminDashboardTodayMetrics;
use App\Support\BinaryClosingCalendar;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class TodaySummaryStatsWidget extends StatsOverviewWidget
{
    protected static ?int $sort = 0;

    protected int | string | array $columnSpan = 'full';

    protected function getColumns(): int
    {
        return 2;
    }

    protected function getStats(): array
    {
        $tz = BinaryClosingCalendar::timezone();
        $date = BinaryClosingCalendar::todayDateString();
        $registrations = AdminDashboardTodayMetrics::todayRegistrationsCount();
        $activeToday = AdminDashboardTodayMetrics::todayActivePanelistsCount();

        return [
            Stat::make('Today Registration', number_format($registrations))
                ->description("New sign-ups on {$date} · Click for full list · {$tz}")
                ->descriptionIcon('heroicon-m-user-plus')
                ->color('primary')
                ->url(TodayNewUserReportResource::getUrl('index')),
            Stat::make('Today Active Users', number_format($activeToday))
                ->description("Active panel paid today · Click for upline & panels · {$tz}")
                ->descriptionIcon('heroicon-m-check-badge')
                ->color('success')
                ->url(TodayActiveUserReportResource::getUrl('index')),
        ];
    }
}

<?php

namespace App\Filament\Admin\Resources\TodayActiveUserReports\Pages;

use App\Filament\Admin\Resources\TodayActiveUserReports\TodayActiveUserReportResource;
use App\Support\BinaryClosingCalendar;
use Filament\Resources\Pages\ListRecords;

class ListTodayActiveUserReports extends ListRecords
{
    protected static string $resource = TodayActiveUserReportResource::class;

    public function getTitle(): string
    {
        $date = BinaryClosingCalendar::todayDateString();
        $tz = BinaryClosingCalendar::timezone();

        return "Today Active Users · {$date} · {$tz}";
    }

    public function getSubheading(): ?string
    {
        return 'Members who paid the $10 active panel today — upline, position, panels, activation & last login.';
    }

    protected function getHeaderActions(): array
    {
        return [];
    }
}

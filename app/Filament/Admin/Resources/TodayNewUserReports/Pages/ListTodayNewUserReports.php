<?php

namespace App\Filament\Admin\Resources\TodayNewUserReports\Pages;

use App\Filament\Admin\Resources\TodayNewUserReports\TodayNewUserReportResource;
use App\Support\BinaryClosingCalendar;
use Filament\Resources\Pages\ListRecords;

class ListTodayNewUserReports extends ListRecords
{
    protected static string $resource = TodayNewUserReportResource::class;

    public function getTitle(): string
    {
        $date = BinaryClosingCalendar::todayDateString();
        $tz = BinaryClosingCalendar::timezone();

        return "Today Registration · {$date} · {$tz}";
    }

    public function getSubheading(): ?string
    {
        return 'Upline, binary position (Left/Right), and activated panels for each new sign-up today.';
    }

    protected function getHeaderActions(): array
    {
        return [];
    }
}

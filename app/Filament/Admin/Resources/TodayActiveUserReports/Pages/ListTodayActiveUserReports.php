<?php

namespace App\Filament\Admin\Resources\TodayActiveUserReports\Pages;

use App\Filament\Admin\Resources\TodayActiveUserReports\TodayActiveUserReportResource;
use Filament\Resources\Pages\ListRecords;

class ListTodayActiveUserReports extends ListRecords
{
    protected static string $resource = TodayActiveUserReportResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}

<?php

namespace App\Filament\Admin\Resources\TodayNewUserReports\Pages;

use App\Filament\Admin\Resources\TodayNewUserReports\TodayNewUserReportResource;
use Filament\Resources\Pages\ListRecords;

class ListTodayNewUserReports extends ListRecords
{
    protected static string $resource = TodayNewUserReportResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}

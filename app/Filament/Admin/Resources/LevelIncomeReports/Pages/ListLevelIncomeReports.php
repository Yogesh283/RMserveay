<?php

namespace App\Filament\Admin\Resources\LevelIncomeReports\Pages;

use App\Filament\Admin\Resources\LevelIncomeReports\LevelIncomeReportResource;
use Filament\Resources\Pages\ListRecords;

class ListLevelIncomeReports extends ListRecords
{
    protected static string $resource = LevelIncomeReportResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}

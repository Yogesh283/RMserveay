<?php

namespace App\Filament\Admin\Resources\MatchingReports\Pages;

use App\Filament\Admin\Resources\MatchingReports\MatchingReportResource;
use Filament\Resources\Pages\ListRecords;

class ListMatchingReports extends ListRecords
{
    protected static string $resource = MatchingReportResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}

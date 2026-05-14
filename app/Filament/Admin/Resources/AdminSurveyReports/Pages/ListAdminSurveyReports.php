<?php

namespace App\Filament\Admin\Resources\AdminSurveyReports\Pages;

use App\Filament\Admin\Resources\AdminSurveyReports\AdminSurveyReportResource;
use Filament\Resources\Pages\ListRecords;

class ListAdminSurveyReports extends ListRecords
{
    protected static string $resource = AdminSurveyReportResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}

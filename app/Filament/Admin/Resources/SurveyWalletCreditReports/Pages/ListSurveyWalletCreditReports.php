<?php

namespace App\Filament\Admin\Resources\SurveyWalletCreditReports\Pages;

use App\Filament\Admin\Resources\SurveyWalletCreditReports\SurveyWalletCreditReportResource;
use Filament\Resources\Pages\ListRecords;

class ListSurveyWalletCreditReports extends ListRecords
{
    protected static string $resource = SurveyWalletCreditReportResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}

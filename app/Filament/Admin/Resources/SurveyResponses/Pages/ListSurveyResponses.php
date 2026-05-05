<?php

namespace App\Filament\Admin\Resources\SurveyResponses\Pages;

use App\Filament\Admin\Resources\SurveyResponses\SurveyResponseResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListSurveyResponses extends ListRecords
{
    protected static string $resource = SurveyResponseResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}

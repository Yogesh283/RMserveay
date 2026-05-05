<?php

namespace App\Filament\Admin\Resources\SurveyQuestions\Pages;

use App\Filament\Admin\Resources\SurveyQuestions\SurveyQuestionResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListSurveyQuestions extends ListRecords
{
    protected static string $resource = SurveyQuestionResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}

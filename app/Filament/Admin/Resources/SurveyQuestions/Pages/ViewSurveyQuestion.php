<?php

namespace App\Filament\Admin\Resources\SurveyQuestions\Pages;

use App\Filament\Admin\Resources\SurveyQuestions\SurveyQuestionResource;
use Filament\Actions\EditAction;
use Filament\Resources\Pages\ViewRecord;

class ViewSurveyQuestion extends ViewRecord
{
    protected static string $resource = SurveyQuestionResource::class;

    protected function getHeaderActions(): array
    {
        return [
            EditAction::make(),
        ];
    }
}

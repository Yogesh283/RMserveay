<?php

namespace App\Filament\Admin\Resources\SurveyQuestions\Pages;

use App\Filament\Admin\Resources\SurveyQuestions\SurveyQuestionResource;
use Filament\Resources\Pages\CreateRecord;

class CreateSurveyQuestion extends CreateRecord
{
    protected static string $resource = SurveyQuestionResource::class;
}

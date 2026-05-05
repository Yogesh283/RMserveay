<?php

namespace App\Filament\Admin\Resources\SurveyQuestions\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class SurveyQuestionForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('survey_id')
                    ->relationship('survey', 'title')
                    ->required(),
                TextInput::make('question_key')
                    ->required(),
                TextInput::make('type')
                    ->required(),
                TextInput::make('label')
                    ->required(),
                Textarea::make('description')
                    ->default(null)
                    ->columnSpanFull(),
                Toggle::make('required')
                    ->required(),
                Textarea::make('options')
                    ->default(null)
                    ->columnSpanFull(),
                TextInput::make('min_rating')
                    ->numeric()
                    ->default(null),
                TextInput::make('max_rating')
                    ->numeric()
                    ->default(null),
                Textarea::make('logic')
                    ->default(null)
                    ->columnSpanFull(),
                TextInput::make('sort_order')
                    ->required()
                    ->numeric()
                    ->default(0),
            ]);
    }
}

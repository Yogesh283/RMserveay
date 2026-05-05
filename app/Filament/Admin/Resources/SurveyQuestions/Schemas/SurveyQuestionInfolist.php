<?php

namespace App\Filament\Admin\Resources\SurveyQuestions\Schemas;

use Filament\Infolists\Components\IconEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Schema;

class SurveyQuestionInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextEntry::make('survey.title')
                    ->label('Survey'),
                TextEntry::make('question_key'),
                TextEntry::make('type'),
                TextEntry::make('label'),
                TextEntry::make('description')
                    ->placeholder('-')
                    ->columnSpanFull(),
                IconEntry::make('required')
                    ->boolean(),
                TextEntry::make('options')
                    ->placeholder('-')
                    ->columnSpanFull(),
                TextEntry::make('min_rating')
                    ->numeric()
                    ->placeholder('-'),
                TextEntry::make('max_rating')
                    ->numeric()
                    ->placeholder('-'),
                TextEntry::make('logic')
                    ->placeholder('-')
                    ->columnSpanFull(),
                TextEntry::make('sort_order')
                    ->numeric(),
                TextEntry::make('created_at')
                    ->dateTime()
                    ->placeholder('-'),
                TextEntry::make('updated_at')
                    ->dateTime()
                    ->placeholder('-'),
            ]);
    }
}

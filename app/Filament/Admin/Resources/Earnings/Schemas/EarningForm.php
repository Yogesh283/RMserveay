<?php

namespace App\Filament\Admin\Resources\Earnings\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class EarningForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('user_id')
                    ->required()
                    ->numeric(),
                Select::make('survey_id')
                    ->relationship('survey', 'title')
                    ->required(),
                Select::make('survey_response_id')
                    ->relationship('surveyResponse', 'id')
                    ->required(),
                TextInput::make('amount')
                    ->required()
                    ->numeric(),
                TextInput::make('description')
                    ->default(null),
            ]);
    }
}

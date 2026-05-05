<?php

namespace App\Filament\Admin\Resources\Surveys\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Schemas\Schema;

class SurveyForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('user_id')
                    ->required()
                    ->numeric(),
                TextInput::make('title')
                    ->required(),
                Textarea::make('description')
                    ->default(null)
                    ->columnSpanFull(),
                TextInput::make('status')
                    ->required()
                    ->default('draft'),
                TextInput::make('member_tier')
                    ->required()
                    ->default('free'),
                TextInput::make('response_count')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('earnings_total')
                    ->required()
                    ->numeric()
                    ->default(0.0),
                Textarea::make('target_audience')
                    ->default(null)
                    ->columnSpanFull(),
            ]);
    }
}

<?php

namespace App\Filament\Admin\Resources\SurveyResponses\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class SurveyResponseForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('survey_id')
                    ->relationship('survey', 'title')
                    ->required(),
                TextInput::make('user_id')
                    ->required()
                    ->numeric(),
                TextInput::make('respondent_user_id')
                    ->numeric()
                    ->default(null),
                Textarea::make('answers')
                    ->required()
                    ->columnSpanFull(),
                Textarea::make('respondent')
                    ->default(null)
                    ->columnSpanFull(),
                Toggle::make('completed')
                    ->required(),
                TextInput::make('drop_off_question_key')
                    ->default(null),
                TextInput::make('completion_time_sec')
                    ->numeric()
                    ->default(null),
                TextInput::make('respondent_reward_usd')
                    ->numeric()
                    ->default(null),
                DateTimePicker::make('respondent_payout_at'),
                TextInput::make('respondent_payout_wallet_tx_id')
                    ->numeric()
                    ->default(null),
            ]);
    }
}

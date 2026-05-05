<?php

namespace App\Filament\Admin\Resources\SurveyResponses\Schemas;

use Filament\Infolists\Components\IconEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Schema;

class SurveyResponseInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextEntry::make('survey.title')
                    ->label('Survey'),
                TextEntry::make('user_id')
                    ->numeric(),
                TextEntry::make('respondent_user_id')
                    ->numeric()
                    ->placeholder('-'),
                TextEntry::make('answers')
                    ->columnSpanFull(),
                TextEntry::make('respondent')
                    ->placeholder('-')
                    ->columnSpanFull(),
                IconEntry::make('completed')
                    ->boolean(),
                TextEntry::make('drop_off_question_key')
                    ->placeholder('-'),
                TextEntry::make('completion_time_sec')
                    ->numeric()
                    ->placeholder('-'),
                TextEntry::make('respondent_reward_usd')
                    ->numeric()
                    ->placeholder('-'),
                TextEntry::make('respondent_payout_at')
                    ->dateTime()
                    ->placeholder('-'),
                TextEntry::make('respondent_payout_wallet_tx_id')
                    ->numeric()
                    ->placeholder('-'),
                TextEntry::make('created_at')
                    ->dateTime()
                    ->placeholder('-'),
                TextEntry::make('updated_at')
                    ->dateTime()
                    ->placeholder('-'),
            ]);
    }
}

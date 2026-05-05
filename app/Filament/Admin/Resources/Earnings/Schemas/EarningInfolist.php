<?php

namespace App\Filament\Admin\Resources\Earnings\Schemas;

use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Schema;

class EarningInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextEntry::make('user_id')
                    ->numeric(),
                TextEntry::make('survey.title')
                    ->label('Survey'),
                TextEntry::make('surveyResponse.id')
                    ->label('Survey response'),
                TextEntry::make('amount')
                    ->numeric(),
                TextEntry::make('description')
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

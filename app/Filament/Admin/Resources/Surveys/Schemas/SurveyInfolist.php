<?php

namespace App\Filament\Admin\Resources\Surveys\Schemas;

use App\Models\Survey;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Schema;

class SurveyInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextEntry::make('publisher.name')
                    ->label('Publisher')
                    ->formatStateUsing(function ($state, $record) {
                        if (! $record) {
                            return $state;
                        }
                        $name = $record->publisher?->name ?: 'User';
                        $email = $record->publisher?->email ? ' · '.$record->publisher->email : '';

                        return trim($name.$email.' (#'.$record->user_id.')');
                    })
                    ->placeholder('-'),
                TextEntry::make('title'),
                TextEntry::make('description')
                    ->placeholder('-')
                    ->columnSpanFull(),
                TextEntry::make('status')
                    ->badge(),
                TextEntry::make('member_tier')
                    ->label('Survey for')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Survey::tierLabel($state))
                    ->color(fn (?string $state): string => match ($state) {
                        Survey::TIER_PANEL => 'info',
                        Survey::TIER_SUB_PANEL => 'warning',
                        Survey::TIER_SUPER_PANEL => 'danger',
                        default => 'gray',
                    }),
                TextEntry::make('response_count')
                    ->numeric(),
                TextEntry::make('earnings_total')
                    ->numeric(),
                TextEntry::make('target_audience')
                    ->placeholder('-')
                    ->columnSpanFull(),
                TextEntry::make('created_at')
                    ->dateTime()
                    ->placeholder('-'),
                TextEntry::make('updated_at')
                    ->dateTime()
                    ->placeholder('-'),
            ]);
    }
}

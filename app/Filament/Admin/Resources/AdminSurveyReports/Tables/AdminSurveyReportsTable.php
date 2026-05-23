<?php

namespace App\Filament\Admin\Resources\AdminSurveyReports\Tables;

use App\Filament\Admin\Resources\Surveys\SurveyResource;
use App\Filament\Admin\Support\AdminUserTableColumns;
use App\Models\Survey;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class AdminSurveyReportsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('title')
                    ->searchable()
                    ->sortable()
                    ->limit(40),
                ...AdminUserTableColumns::identity('publisher'),
                TextColumn::make('status')
                    ->badge()
                    ->sortable(),
                TextColumn::make('member_tier')
                    ->label('Tier')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Survey::tierLabel($state))
                    ->sortable(),
                TextColumn::make('response_count')
                    ->label('Responses')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('earnings_total')
                    ->label('Earnings')
                    ->money('USD')
                    ->sortable(),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('response_count', 'desc')
            ->recordUrl(fn (Survey $record): string => SurveyResource::getUrl('view', ['record' => $record]));
    }
}

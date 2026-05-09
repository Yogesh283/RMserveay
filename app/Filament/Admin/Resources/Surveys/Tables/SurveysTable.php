<?php

namespace App\Filament\Admin\Resources\Surveys\Tables;

use App\Models\Survey;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Actions\ViewAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class SurveysTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('publisher.name')
                    ->label('Publisher')
                    ->description(fn ($record) => $record?->publisher?->email
                        ? $record->publisher->email.' (#'.$record->user_id.')'
                        : ('User #'.$record?->user_id))
                    ->searchable(['name', 'email'])
                    ->sortable(),
                TextColumn::make('title')
                    ->searchable(),
                TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'active' => 'success',
                        'draft' => 'gray',
                        'inactive' => 'warning',
                        default => 'secondary',
                    })
                    ->searchable(),
                TextColumn::make('member_tier')
                    ->label('Survey for')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Survey::tierLabel($state))
                    ->color(fn (?string $state): string => match ($state) {
                        Survey::TIER_PANEL => 'info',
                        Survey::TIER_SUB_PANEL => 'warning',
                        Survey::TIER_SUPER_PANEL => 'danger',
                        default => 'gray',
                    })
                    ->sortable(),
                TextColumn::make('response_count')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('earnings_total')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('member_tier')
                    ->label('Survey for')
                    ->options(Survey::tierOptions()),
                SelectFilter::make('status')
                    ->options([
                        'draft' => 'Draft',
                        'active' => 'Active',
                        'inactive' => 'Inactive',
                    ]),
            ])
            ->recordActions([
                ViewAction::make(),
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}

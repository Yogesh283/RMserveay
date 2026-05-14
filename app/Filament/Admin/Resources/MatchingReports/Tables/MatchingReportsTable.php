<?php

namespace App\Filament\Admin\Resources\MatchingReports\Tables;

use App\Filament\Admin\Resources\Users\UserResource;
use App\Models\BinaryDailyClosing;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class MatchingReportsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('closing_date')
                    ->date()
                    ->sortable(),
                TextColumn::make('user.login_uid')
                    ->label('User ID')
                    ->badge()
                    ->searchable()
                    ->sortable(),
                TextColumn::make('scope')
                    ->badge()
                    ->sortable(),
                TextColumn::make('pairs_matched')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('payout_usd')
                    ->label('Payout')
                    ->money('USD')
                    ->sortable(),
                TextColumn::make('left_carry_in')
                    ->label('L in')
                    ->numeric()
                    ->toggleable(),
                TextColumn::make('right_carry_in')
                    ->label('R in')
                    ->numeric()
                    ->toggleable(),
                TextColumn::make('left_carry_out')
                    ->label('L out')
                    ->numeric()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('right_carry_out')
                    ->label('R out')
                    ->numeric()
                    ->toggleable(isToggledHiddenByDefault: true),
                IconColumn::make('cap_hit')
                    ->label('Cap')
                    ->boolean(),
                TextColumn::make('per_pair_usd')
                    ->label('Per pair')
                    ->money('USD')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('closing_date', 'desc')
            ->recordUrl(fn (BinaryDailyClosing $record): string => UserResource::getUrl('view', ['record' => $record->user_id]));
    }
}

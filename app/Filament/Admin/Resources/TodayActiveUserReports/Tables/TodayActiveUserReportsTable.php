<?php

namespace App\Filament\Admin\Resources\TodayActiveUserReports\Tables;

use App\Filament\Admin\Resources\Users\UserResource;
use App\Models\User;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class TodayActiveUserReportsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('login_uid')
                    ->label('User ID')
                    ->badge()
                    ->searchable()
                    ->sortable()
                    ->formatStateUsing(fn ($state) => $state ? strtoupper((string) $state) : '—'),
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('email')
                    ->searchable(),
                TextColumn::make('minimum_panel_fee_paid_at')
                    ->label('Min. panel paid')
                    ->dateTime()
                    ->placeholder('—')
                    ->sortable(),
                TextColumn::make('wallet_balance')
                    ->label('Wallet')
                    ->money('USD')
                    ->sortable(),
                TextColumn::make('created_at')
                    ->label('Registered')
                    ->dateTime()
                    ->sortable(),
            ])
            ->defaultSort('login_uid')
            ->recordUrl(fn (User $record): string => UserResource::getUrl('view', ['record' => $record]));
    }
}

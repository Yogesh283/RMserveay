<?php

namespace App\Filament\Admin\Resources\ActivePanelUsers\Tables;

use App\Filament\Admin\Resources\Users\UserResource;
use App\Models\ActivePanelUser;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class ActivePanelUsersTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('user.login_uid')
                    ->label('User ID')
                    ->badge()
                    ->searchable()
                    ->sortable(),
                TextColumn::make('user.name')
                    ->label('Name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('user.email')
                    ->label('Email')
                    ->searchable()
                    ->toggleable(),
                TextColumn::make('activated_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('total_paid_usd')
                    ->label('Total paid (USD)')
                    ->money('USD')
                    ->sortable(),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('activated_at', 'desc')
            ->recordUrl(fn (ActivePanelUser $record): string => UserResource::getUrl('view', ['record' => $record->user_id]));
    }
}

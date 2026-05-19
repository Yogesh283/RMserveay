<?php

namespace App\Filament\Admin\Support;

use App\Filament\Admin\Resources\Users\UserResource;
use App\Models\User;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

final class AdminUserReportsTableColumns
{
    public static function applyRegistrationColumns(Table $table): Table
    {
        return $table->columns([
            ...self::identityColumns(),
            TextColumn::make('package')
                ->label('Package')
                ->state(fn (User $record): string => AdminUserReportHelper::packageLabel($record)),
            TextColumn::make('upline')
                ->label('Upline ID / Name')
                ->state(fn (User $record): string => AdminUserReportHelper::uplineLabel($record->sponsor)),
            TextColumn::make('binary_side')
                ->label('Position')
                ->formatStateUsing(fn (?string $state): string => AdminUserReportHelper::positionLabel($state)),
            TextColumn::make('activated_panels')
                ->label('Activated panels')
                ->state(fn (User $record): string => AdminUserReportHelper::activatedPanelsSummary($record))
                ->wrap(),
            TextColumn::make('created_at')
                ->label('Registration date')
                ->dateTime()
                ->sortable(),
        ]);
    }

    public static function applyActiveColumns(Table $table): Table
    {
        return $table->columns([
            ...self::identityColumns(),
            TextColumn::make('package')
                ->label('Package')
                ->state(fn (User $record): string => AdminUserReportHelper::packageLabel($record)),
            TextColumn::make('upline')
                ->label('Upline ID / Name')
                ->state(fn (User $record): string => AdminUserReportHelper::uplineLabel($record->sponsor)),
            TextColumn::make('binary_side')
                ->label('Position')
                ->formatStateUsing(fn (?string $state): string => AdminUserReportHelper::positionLabel($state)),
            TextColumn::make('activated_panels')
                ->label('Activated panels')
                ->state(fn (User $record): string => AdminUserReportHelper::activatedPanelsSummary($record))
                ->wrap(),
            TextColumn::make('minimum_panel_fee_paid_at')
                ->label('Activation date')
                ->dateTime()
                ->sortable(),
            TextColumn::make('last_login')
                ->label('Last login')
                ->state(fn (User $record) => AdminUserReportHelper::lastLoginAt($record->id))
                ->dateTime()
                ->placeholder('—'),
        ]);
    }

    /**
     * @return list<TextColumn>
     */
    private static function identityColumns(): array
    {
        return [
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
                ->searchable()
                ->copyable(),
            TextColumn::make('phone')
                ->label('Mobile')
                ->placeholder('—')
                ->searchable(),
        ];
    }

    public static function defaultRecordUrl(): \Closure
    {
        return fn (User $record): string => UserResource::getUrl('view', ['record' => $record]);
    }
}

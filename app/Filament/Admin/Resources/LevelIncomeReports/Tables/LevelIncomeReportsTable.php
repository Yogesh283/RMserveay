<?php

namespace App\Filament\Admin\Resources\LevelIncomeReports\Tables;

use App\Filament\Admin\Resources\Users\UserResource;
use App\Filament\Admin\Support\AdminUserTableColumns;
use App\Models\WalletTransaction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Support\Str;

class LevelIncomeReportsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
                ...AdminUserTableColumns::identity('user'),
                TextColumn::make('amount')
                    ->money('USD')
                    ->sortable(),
                TextColumn::make('balance_after')
                    ->money('USD')
                    ->toggleable(),
                TextColumn::make('meta_preview')
                    ->label('Meta')
                    ->state(function (WalletTransaction $record): string {
                        $json = json_encode($record->meta ?? [], JSON_UNESCAPED_SLASHES);

                        return Str::limit(is_string($json) ? $json : '{}', 120);
                    })
                    ->wrap(),
            ])
            ->defaultSort('created_at', 'desc')
            ->recordUrl(fn (WalletTransaction $record): string => UserResource::getUrl('view', ['record' => $record->user_id]));
    }
}

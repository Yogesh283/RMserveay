<?php

namespace App\Filament\Admin\Resources\NowPaymentIntents\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Actions\ViewAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class NowPaymentIntentsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('user.name')
                    ->searchable(),
                TextColumn::make('order_id')
                    ->searchable(),
                TextColumn::make('payment_id')
                    ->searchable(),
                TextColumn::make('amount_usd')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('pay_currency')
                    ->searchable(),
                TextColumn::make('pay_amount')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('pay_address')
                    ->searchable(),
                TextColumn::make('payment_status')
                    ->searchable(),
                IconColumn::make('credited')
                    ->boolean(),
                TextColumn::make('payin_hash')
                    ->searchable(),
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
                //
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

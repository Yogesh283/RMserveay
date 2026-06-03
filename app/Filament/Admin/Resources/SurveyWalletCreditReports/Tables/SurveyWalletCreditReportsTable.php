<?php

namespace App\Filament\Admin\Resources\SurveyWalletCreditReports\Tables;

use App\Filament\Admin\Resources\Users\UserResource;
use App\Filament\Admin\Support\AdminUserTableColumns;
use App\Models\WalletTransaction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class SurveyWalletCreditReportsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('created_at')
                    ->label('Credited at')
                    ->dateTime()
                    ->sortable(),
                ...AdminUserTableColumns::identity('user'),
                TextColumn::make('user.name')
                    ->label('Name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('user.email')
                    ->label('Email')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('amount')
                    ->label('Survey income')
                    ->money('USD')
                    ->sortable(),
                TextColumn::make('survey_balance_after')
                    ->label('Survey wallet after')
                    ->state(fn (WalletTransaction $record): string => (string) (
                        $record->meta['survey_balance_after']
                        ?? $record->balance_after
                        ?? '0.00'
                    ))
                    ->money('USD')
                    ->sortable(query: function ($query, string $direction): void {
                        $query->orderBy('balance_after', $direction);
                    }),
                TextColumn::make('source')
                    ->label('Source')
                    ->state(function (WalletTransaction $record): string {
                        $meta = $record->meta ?? [];

                        if (! empty($meta['survey_response_id'])) {
                            return 'Publisher survey #'.$meta['survey_response_id'];
                        }

                        if (! empty($meta['reference'])) {
                            return (string) $meta['reference'];
                        }

                        if (! empty($meta['payout'])) {
                            return 'Payout: '.$meta['payout'];
                        }

                        return 'Self survey';
                    })
                    ->wrap(),
            ])
            ->searchPlaceholder('Search by User ID, UID, name, or email…')
            ->defaultSort('created_at', 'desc')
            ->recordUrl(fn (WalletTransaction $record): string => UserResource::getUrl('view', ['record' => $record->user_id]));
    }
}

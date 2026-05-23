<?php

namespace App\Filament\Admin\Resources\SurveyResponses\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Actions\ViewAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class SurveyResponsesTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('survey.title')
                    ->searchable(),
                TextColumn::make('user_id')
                    ->label('User ID')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('respondent_user_id')
                    ->label('Respondent ID')
                    ->numeric()
                    ->sortable(),
                IconColumn::make('completed')
                    ->boolean(),
                TextColumn::make('drop_off_question_key')
                    ->searchable(),
                TextColumn::make('completion_time_sec')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('respondent_reward_usd')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('respondent_payout_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('respondent_payout_wallet_tx_id')
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

<?php

namespace App\Filament\Admin\Resources\Users\Tables;

use App\Filament\Admin\Resources\Users\UserResource;
use App\Models\User;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Actions\ViewAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class UsersTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->recordUrl(fn ($record): string => UserResource::getUrl('view', ['record' => $record]))
            ->columns([
                TextColumn::make('name')
                    ->weight('semibold')
                    ->color('primary')
                    ->searchable(),
                TextColumn::make('email')
                    ->label('Email address')
                    ->searchable(),
                TextColumn::make('login_uid')
                    ->searchable(),
                TextColumn::make('email_verified_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('profile_completed_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('user_type')
                    ->searchable(),
                TextColumn::make('qualification')
                    ->searchable(),
                TextColumn::make('phone')
                    ->searchable(),
                TextColumn::make('referral_code')
                    ->searchable(),
                TextColumn::make('p2p_receive_code')
                    ->searchable(),
                TextColumn::make('sponsor.login_uid')
                    ->label('Sponsor UID')
                    ->placeholder('-')
                    ->searchable(),
                TextColumn::make('binaryParent.login_uid')
                    ->label('Parent UID')
                    ->placeholder('-')
                    ->searchable(),
                TextColumn::make('binary_side')
                    ->searchable(),
                TextColumn::make('left_child_uid')
                    ->label('Left Child UID')
                    ->state(fn (User $record): ?string => $record->left_child_id ? User::query()->whereKey($record->left_child_id)->value('login_uid') : null)
                    ->placeholder('-'),
                TextColumn::make('right_child_uid')
                    ->label('Right Child UID')
                    ->state(fn (User $record): ?string => $record->right_child_id ? User::query()->whereKey($record->right_child_id)->value('login_uid') : null)
                    ->placeholder('-'),
                TextColumn::make('left_child_id')
                    ->numeric()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('right_child_id')
                    ->numeric()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('wallet_balance')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('p2p_wallet_balance')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('usdt_bep20_withdrawal_address')
                    ->searchable(),
                TextColumn::make('activation_fee_paid_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('minimum_panel_fee_paid_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('sub_panel_count')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('super_sub_panel_count')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('membership_tier')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('panel_match_carry_left')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('panel_match_carry_right')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('spm_match_day')
                    ->date()
                    ->sortable(),
                TextColumn::make('spm_cumulative_panels')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('spm_milestone_mask')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('super_panel_match_carry_left')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('super_panel_match_carry_right')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('sspm_match_day')
                    ->date()
                    ->sortable(),
                TextColumn::make('sspm_cumulative_panels')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('sspm_milestone_mask')
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

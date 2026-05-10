<?php

namespace App\Filament\Admin\Resources\Users\Tables;

use App\Filament\Admin\Resources\Users\UserResource;
use App\Models\User;
use App\Models\WalletTransaction;
use Filament\Actions\Action;
use Filament\Actions\ActionGroup;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Actions\ViewAction;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Notifications\Notification;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UsersTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->recordUrl(fn ($record): string => UserResource::getUrl('view', ['record' => $record]))
            ->columns([
                TextColumn::make('login_uid')
                    ->label('User ID')
                    ->badge()
                    ->color('info')
                    ->copyable()
                    ->searchable()
                    ->sortable()
                    ->formatStateUsing(fn ($state) => $state ? strtoupper((string) $state) : '—'),
                TextColumn::make('name')
                    ->weight('semibold')
                    ->color('primary')
                    ->searchable(),
                TextColumn::make('email')
                    ->label('Email address')
                    ->copyable()
                    ->searchable(),
                TextColumn::make('phone')
                    ->label('Mobile')
                    ->copyable()
                    ->searchable()
                    ->placeholder('—'),
                TextColumn::make('wallet_balance')
                    ->label('Main USDT')
                    ->money('USD')
                    ->sortable(),
                TextColumn::make('p2p_wallet_balance')
                    ->label('P2P USDT')
                    ->money('USD')
                    ->sortable(),
                TextColumn::make('email_verified_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('profile_completed_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('user_type')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('qualification')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('referral_code')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('p2p_receive_code')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('sponsor.login_uid')
                    ->label('Sponsor UID')
                    ->placeholder('-')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('binaryParent.login_uid')
                    ->label('Parent UID')
                    ->placeholder('-')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('binary_side')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('left_child_uid')
                    ->label('Left Child UID')
                    ->state(fn (User $record): ?string => $record->left_child_id ? User::query()->whereKey($record->left_child_id)->value('login_uid') : null)
                    ->placeholder('-')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('right_child_uid')
                    ->label('Right Child UID')
                    ->state(fn (User $record): ?string => $record->right_child_id ? User::query()->whereKey($record->right_child_id)->value('login_uid') : null)
                    ->placeholder('-')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('usdt_bep20_withdrawal_address')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('activation_fee_paid_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('minimum_panel_fee_paid_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('sub_panel_count')
                    ->numeric()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('super_sub_panel_count')
                    ->numeric()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('membership_tier')
                    ->numeric()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->searchPlaceholder('Search by User ID, name, email, mobile…')
            ->filters([
                //
            ])
            ->recordActions([
                ViewAction::make(),
                EditAction::make(),
                ActionGroup::make([
                    self::updateEmailAction(),
                    self::updateMobileAction(),
                    self::creditP2pWalletAction(),
                ])
                    ->label('Quick actions')
                    ->icon(Heroicon::OutlinedBolt)
                    ->color('warning')
                    ->button(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }

    /** Quick Action: update only the email — no OTP, instant save. */
    protected static function updateEmailAction(): Action
    {
        return Action::make('update_email')
            ->label('Update email')
            ->icon(Heroicon::OutlinedEnvelope)
            ->color('info')
            ->modalHeading(fn (User $record) => 'Update email for '.($record->login_uid ?? $record->name ?? '#'.$record->id))
            ->modalSubmitActionLabel('Save email')
            ->fillForm(fn (User $record): array => [
                'email' => $record->email,
            ])
            ->schema([
                TextInput::make('email')
                    ->label('New email address')
                    ->email()
                    ->required()
                    ->maxLength(255)
                    ->autocomplete('off')
                    ->rule(fn (User $record) => Rule::unique('users', 'email')->ignore($record->id)),
            ])
            ->action(function (array $data, User $record): void {
                $record->forceFill([
                    'email' => strtolower(trim((string) $data['email'])),
                ])->save();

                Notification::make()
                    ->title('Email updated')
                    ->body('Saved as '.$record->email)
                    ->success()
                    ->send();
            });
    }

    /** Quick Action: update only the mobile — no OTP, instant save. */
    protected static function updateMobileAction(): Action
    {
        return Action::make('update_mobile')
            ->label('Update mobile')
            ->icon(Heroicon::OutlinedDevicePhoneMobile)
            ->color('success')
            ->modalHeading(fn (User $record) => 'Update mobile for '.($record->login_uid ?? $record->name ?? '#'.$record->id))
            ->modalSubmitActionLabel('Save mobile')
            ->fillForm(fn (User $record): array => [
                'phone' => $record->phone,
            ])
            ->schema([
                TextInput::make('phone')
                    ->label('Mobile number (with country code)')
                    ->tel()
                    ->placeholder('+15551234567')
                    ->maxLength(32)
                    ->helperText('Leave empty to clear the saved mobile number.'),
            ])
            ->action(function (array $data, User $record): void {
                $next = trim((string) ($data['phone'] ?? ''));
                $record->forceFill([
                    'phone' => $next === '' ? null : $next,
                ])->save();

                Notification::make()
                    ->title('Mobile updated')
                    ->body($record->phone ? 'Saved as '.$record->phone : 'Mobile cleared.')
                    ->success()
                    ->send();
            });
    }

    /** Quick Action: credit funds to the user's P2P wallet — admin only. */
    protected static function creditP2pWalletAction(): Action
    {
        return Action::make('credit_p2p_wallet')
            ->label('Credit P2P wallet')
            ->icon(Heroicon::OutlinedBanknotes)
            ->color('primary')
            ->modalHeading(fn (User $record) => 'Credit P2P wallet of '.($record->login_uid ?? $record->name ?? '#'.$record->id))
            ->modalDescription('This will add USDT to the user\'s P2P wallet and create a transaction record.')
            ->modalSubmitActionLabel('Credit funds')
            ->modalIcon(Heroicon::OutlinedBanknotes)
            ->schema([
                TextInput::make('amount_usd')
                    ->label('Amount (USDT)')
                    ->numeric()
                    ->minValue(0.01)
                    ->maxValue(999999.99)
                    ->step('0.01')
                    ->required()
                    ->placeholder('e.g. 50.00'),
                Textarea::make('note')
                    ->label('Note (optional)')
                    ->rows(2)
                    ->maxLength(500)
                    ->placeholder('Reason for this admin credit (visible only to admins).'),
            ])
            ->action(function (array $data, User $record): void {
                $amount = number_format((float) $data['amount_usd'], 2, '.', '');
                $note = trim((string) ($data['note'] ?? ''));
                $adminId = (int) (auth()->id() ?? 0);
                $adminName = (string) (auth()->user()?->name ?? '');

                DB::transaction(function () use ($record, $amount, $note, $adminId, $adminName): void {
                    /** @var User $user */
                    $user = User::whereKey($record->id)->lockForUpdate()->firstOrFail();
                    $user->reconcileBalancesFromWalletTableIfBlank();
                    $user->refresh();

                    $user->p2p_wallet_balance = bcadd((string) $user->p2p_wallet_balance, $amount, 2);
                    $user->save();

                    WalletTransaction::create([
                        'user_id' => $user->id,
                        'type' => WalletTransaction::TYPE_P2P_TRANSFER_IN,
                        'amount' => $amount,
                        'balance_after' => (string) $user->wallet_balance,
                        'meta' => [
                            'admin_credit' => true,
                            'admin_user_id' => $adminId,
                            'admin_name' => $adminName,
                            'note' => $note !== '' ? $note : null,
                            'bucket' => 'p2p',
                            'p2p_balance_after' => (string) $user->p2p_wallet_balance,
                            'from_login_uid' => 'ADMIN',
                            'from_name' => $adminName !== '' ? 'Admin · '.$adminName : 'Admin',
                        ],
                    ]);
                });

                $fresh = $record->fresh();
                Notification::make()
                    ->title('P2P wallet credited')
                    ->body('+$'.$amount.' USDT · new P2P balance: $'.($fresh?->p2p_wallet_balance ?? '—'))
                    ->success()
                    ->send();
            });
    }
}

<?php

namespace App\Filament\Admin\Resources\WithdrawalRequests\Tables;

use App\Filament\Admin\Resources\Users\UserResource;
use App\Models\WalletTransaction;
use App\Services\NowPayments\NowPaymentsWithdrawalService;
use Filament\Actions\Action;
use Filament\Actions\ActionGroup;
use Filament\Actions\ViewAction;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class WithdrawalRequestsTable
{
    public static function configure(Table $table): Table
    {
        $payoutsOn = (bool) config('nowpayments.payouts.enabled');

        return $table
            ->columns([
                TextColumn::make('id')
                    ->label('#')
                    ->sortable(),
                TextColumn::make('user.login_uid')
                    ->label('User ID')
                    ->badge()
                    ->searchable()
                    ->formatStateUsing(fn ($state) => $state ? strtoupper((string) $state) : '—'),
                TextColumn::make('user.name')
                    ->label('Name')
                    ->searchable(),
                TextColumn::make('user.email')
                    ->label('Email')
                    ->searchable()
                    ->toggleable(),
                TextColumn::make('meta.gross_usd')
                    ->label('Gross (USD)')
                    ->money('USD'),
                TextColumn::make('meta.fee_usd')
                    ->label('Fee')
                    ->money('USD')
                    ->toggleable(),
                TextColumn::make('meta.net_sent_usd')
                    ->label('Net payout')
                    ->money('USD')
                    ->weight('semibold'),
                TextColumn::make('meta.bep20_address')
                    ->label('BEP20 address')
                    ->copyable()
                    ->limit(18)
                    ->tooltip(fn (WalletTransaction $record): ?string => is_array($record->meta)
                        ? ($record->meta['bep20_address'] ?? null)
                        : null),
                TextColumn::make('withdrawal_status')
                    ->label('Status')
                    ->badge()
                    ->state(fn (WalletTransaction $record): string => self::statusLabel($record))
                    ->color(fn (WalletTransaction $record): string => self::statusColor($record)),
                TextColumn::make('meta.nowpayments.payout_id')
                    ->label('NP payout ID')
                    ->placeholder('—')
                    ->copyable()
                    ->toggleable(),
                TextColumn::make('meta.nowpayments.last_status')
                    ->label('NP status')
                    ->placeholder('—')
                    ->toggleable(),
                TextColumn::make('created_at')
                    ->label('Requested')
                    ->dateTime()
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'queued' => 'Queued (pending send)',
                        'np_creating' => 'NP — awaiting 2FA',
                        'np_processing' => 'NP — processing',
                        'sent' => 'Sent / finished',
                        'failed' => 'Failed',
                        'rejected' => 'Rejected (refunded)',
                    ])
                    ->query(function ($query, array $data) {
                        $value = $data['value'] ?? null;
                        if ($value === null || $value === '') {
                            return $query;
                        }

                        return $query->where('meta->status', $value);
                    }),
            ])
            ->searchPlaceholder('Search user ID, name, email, address…')
            ->recordActions([
                ViewAction::make(),
                ActionGroup::make([
                    Action::make('sendNowPayments')
                        ->label('Send via NOWPayments')
                        ->icon(Heroicon::OutlinedPaperAirplane)
                        ->color('success')
                        ->requiresConfirmation()
                        ->modalHeading('Send withdrawal to NOWPayments')
                        ->modalDescription(
                            $payoutsOn
                                ? 'Creates a mass payout to the member BEP20 address (net amount after platform fee). '
                                    .'You may need to enter a 2FA code from your NOWPayments master account email or authenticator.'
                                : 'NOWPayments payouts are disabled — set NOWPAYMENTS_PAYOUTS_ENABLED and credentials in .env first.'
                        )
                        ->visible(fn (WalletTransaction $record): bool => $payoutsOn
                            && in_array(self::rawStatus($record), ['queued', 'failed'], true))
                        ->action(function (WalletTransaction $record): void {
                            self::runWithdrawalAction($record, function (NowPaymentsWithdrawalService $svc) use ($record): void {
                                $svc->sendToNowPayments($record->fresh());
                                Notification::make()
                                    ->title('Sent to NOWPayments')
                                    ->body('If status stays “creating”, use “Verify 2FA” with the code from your NOWPayments account.')
                                    ->success()
                                    ->send();
                            });
                        }),
                    Action::make('verifyNowPayments')
                        ->label('Verify 2FA')
                        ->icon(Heroicon::OutlinedShieldCheck)
                        ->color('warning')
                        ->visible(fn (WalletTransaction $record): bool => $payoutsOn
                            && self::rawStatus($record) === 'np_creating')
                        ->schema([
                            TextInput::make('verification_code')
                                ->label('2FA code (email or authenticator)')
                                ->required()
                                ->maxLength(32),
                        ])
                        ->action(function (WalletTransaction $record, array $data): void {
                            self::runWithdrawalAction($record, function (NowPaymentsWithdrawalService $svc) use ($record, $data): void {
                                $svc->verifyWithCode($record->fresh(), (string) $data['verification_code']);
                                Notification::make()
                                    ->title('Payout verified')
                                    ->body('NOWPayments should process the transfer. Use “Refresh NP status” to update.')
                                    ->success()
                                    ->send();
                            });
                        }),
                    Action::make('refreshNowPayments')
                        ->label('Refresh NP status')
                        ->icon(Heroicon::OutlinedArrowPath)
                        ->visible(fn (WalletTransaction $record): bool => $payoutsOn
                            && ! in_array(self::rawStatus($record), ['queued', 'rejected'], true))
                        ->action(function (WalletTransaction $record): void {
                            self::runWithdrawalAction($record, function (NowPaymentsWithdrawalService $svc) use ($record): void {
                                $body = $svc->refreshStatus($record->fresh());
                                $status = is_array($body) ? ($body['status'] ?? $body['payout_status'] ?? 'unknown') : 'unknown';
                                Notification::make()
                                    ->title('Status updated')
                                    ->body('NOWPayments status: '.(string) $status)
                                    ->success()
                                    ->send();
                            });
                        }),
                    Action::make('rejectRefund')
                        ->label('Reject & refund')
                        ->icon(Heroicon::OutlinedXCircle)
                        ->color('danger')
                        ->requiresConfirmation()
                        ->visible(fn (WalletTransaction $record): bool => ! in_array(
                            self::rawStatus($record),
                            ['sent', 'rejected', 'np_processing'],
                            true,
                        ))
                        ->schema([
                            Textarea::make('reason')
                                ->label('Reason (optional)')
                                ->rows(2),
                        ])
                        ->action(function (WalletTransaction $record, array $data): void {
                            self::runWithdrawalAction($record, function (NowPaymentsWithdrawalService $svc) use ($record, $data): void {
                                $svc->rejectAndRefund($record->fresh(), (string) ($data['reason'] ?? ''));
                                Notification::make()
                                    ->title('Withdrawal rejected')
                                    ->body('Gross amount credited back to member main wallet.')
                                    ->warning()
                                    ->send();
                            });
                        }),
                    Action::make('openUser')
                        ->label('Open member')
                        ->icon(Heroicon::OutlinedUser)
                        ->url(fn (WalletTransaction $record) => $record->user
                            ? UserResource::getUrl('view', ['record' => $record->user])
                            : null),
                ])
                    ->label('Payout actions')
                    ->icon(Heroicon::OutlinedBanknotes)
                    ->button(),
            ]);
    }

    public static function rawStatus(WalletTransaction $record): string
    {
        $meta = is_array($record->meta) ? $record->meta : [];

        return (string) ($meta['status'] ?? 'queued');
    }

    public static function statusLabel(WalletTransaction $record): string
    {
        return match (self::rawStatus($record)) {
            'queued' => 'Queued',
            'np_creating' => 'NP — verify 2FA',
            'np_processing' => 'NP processing',
            'sent' => 'Sent',
            'failed' => 'Failed',
            'rejected' => 'Rejected',
            default => Str::headline(self::rawStatus($record)),
        };
    }

    public static function statusColor(WalletTransaction $record): string
    {
        return match (self::rawStatus($record)) {
            'queued' => 'warning',
            'np_creating' => 'info',
            'np_processing' => 'primary',
            'sent' => 'success',
            'failed' => 'danger',
            'rejected' => 'gray',
            default => 'gray',
        };
    }

    /**
     * @param  callable(NowPaymentsWithdrawalService): void  $callback
     */
    protected static function runWithdrawalAction(WalletTransaction $record, callable $callback): void
    {
        try {
            $callback(app(NowPaymentsWithdrawalService::class));
        } catch (ValidationException $e) {
            Notification::make()
                ->title('Withdrawal action failed')
                ->body(collect($e->errors())->flatten()->first() ?? $e->getMessage())
                ->danger()
                ->send();
        } catch (Throwable $e) {
            report($e);
            Notification::make()
                ->title('Withdrawal action error')
                ->body(Str::limit($e->getMessage(), 2000))
                ->danger()
                ->persistent()
                ->send();
        }
    }
}

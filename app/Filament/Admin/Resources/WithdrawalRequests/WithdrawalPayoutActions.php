<?php

namespace App\Filament\Admin\Resources\WithdrawalRequests;

use App\Filament\Admin\Resources\WithdrawalRequests\Tables\WithdrawalRequestsTable;
use App\Filament\Admin\Resources\Users\UserResource;
use App\Models\WalletTransaction;
use App\Services\NowPayments\NowPaymentsWithdrawalService;
use Filament\Actions\Action;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Support\Icons\Heroicon;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

final class WithdrawalPayoutActions
{
    public static function payoutsEnabled(): bool
    {
        return (bool) config('nowpayments.payouts.enabled');
    }

    /**
     * @return array<int, Action>
     */
    public static function make(): array
    {
        $payoutsOn = self::payoutsEnabled();

        return [
            Action::make('sendNowPayments')
                ->label('Pay via NOWPayments')
                ->icon(Heroicon::OutlinedPaperAirplane)
                ->color('success')
                ->requiresConfirmation()
                ->modalHeading('Send payout via NOWPayments')
                ->modalDescription(
                    $payoutsOn
                        ? 'USDT BEP-20 mass payout to the member address (net amount). '
                            .'After submit, enter 2FA from your NOWPayments master account if asked.'
                        : 'Enable NOWPAYMENTS_PAYOUTS_ENABLED plus payout email/password in .env.'
                )
                ->visible(fn (WalletTransaction $record): bool => $payoutsOn
                    && in_array(WithdrawalRequestsTable::rawStatus($record), ['queued', 'failed'], true))
                ->action(function (WalletTransaction $record): void {
                    self::run($record, function (NowPaymentsWithdrawalService $svc) use ($record): void {
                        $svc->sendToNowPayments($record->fresh());
                        Notification::make()
                            ->title('Sent to NOWPayments')
                            ->body('Use “Verify 2FA” if status is “NP — verify 2FA”.')
                            ->success()
                            ->send();
                    });
                }),
            Action::make('verifyNowPayments')
                ->label('Verify 2FA')
                ->icon(Heroicon::OutlinedShieldCheck)
                ->color('warning')
                ->visible(fn (WalletTransaction $record): bool => $payoutsOn
                    && WithdrawalRequestsTable::rawStatus($record) === 'np_creating')
                ->schema([
                    TextInput::make('verification_code')
                        ->label('2FA code (NOWPayments email or app)')
                        ->required()
                        ->maxLength(32),
                ])
                ->action(function (WalletTransaction $record, array $data): void {
                    self::run($record, function (NowPaymentsWithdrawalService $svc) use ($record, $data): void {
                        $svc->verifyWithCode($record->fresh(), (string) $data['verification_code']);
                        Notification::make()
                            ->title('Payout verified')
                            ->body('Refresh NP status until it shows Sent.')
                            ->success()
                            ->send();
                    });
                }),
            Action::make('refreshNowPayments')
                ->label('Refresh NP status')
                ->icon(Heroicon::OutlinedArrowPath)
                ->visible(fn (WalletTransaction $record): bool => $payoutsOn
                    && ! in_array(WithdrawalRequestsTable::rawStatus($record), ['queued', 'rejected'], true))
                ->action(function (WalletTransaction $record): void {
                    self::run($record, function (NowPaymentsWithdrawalService $svc) use ($record): void {
                        $body = $svc->refreshStatus($record->fresh());
                        $status = is_array($body) ? ($body['status'] ?? $body['payout_status'] ?? 'unknown') : 'unknown';
                        Notification::make()
                            ->title('Status updated')
                            ->body('NOWPayments: '.(string) $status)
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
                    WithdrawalRequestsTable::rawStatus($record),
                    ['sent', 'rejected', 'np_processing'],
                    true,
                ))
                ->schema([
                    Textarea::make('reason')
                        ->label('Reason (optional)')
                        ->rows(2),
                ])
                ->action(function (WalletTransaction $record, array $data): void {
                    self::run($record, function (NowPaymentsWithdrawalService $svc) use ($record, $data): void {
                        $svc->rejectAndRefund($record->fresh(), (string) ($data['reason'] ?? ''));
                        Notification::make()
                            ->title('Withdrawal rejected')
                            ->body('Gross amount returned to member main wallet.')
                            ->warning()
                            ->send();
                    });
                }),
            Action::make('openUser')
                ->label('Open member')
                ->icon(Heroicon::OutlinedUser)
                ->url(fn (WalletTransaction $record): ?string => $record->user
                    ? UserResource::getUrl('view', ['record' => $record->user])
                    : null),
        ];
    }

    /**
     * @param  callable(NowPaymentsWithdrawalService): void  $callback
     */
    public static function run(WalletTransaction $record, callable $callback): void
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

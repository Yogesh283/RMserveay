<?php

namespace App\Filament\Admin\Resources\WithdrawalRequests\Pages;

use App\Filament\Admin\Resources\WithdrawalRequests\WithdrawalRequestResource;
use App\Services\NowPayments\NowPaymentsMassPayoutClient;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ListRecords;
use Filament\Support\Icons\Heroicon;
use Illuminate\Support\Str;
use Throwable;

class ListWithdrawalRequests extends ListRecords
{
    protected static string $resource = WithdrawalRequestResource::class;

    public function getSubheading(): ?string
    {
        if (! config('nowpayments.payouts.enabled')) {
            return 'Payouts OFF — set NOWPAYMENTS_PAYOUTS_ENABLED=true, NOWPAYMENTS_PAYOUT_EMAIL, NOWPAYMENTS_PAYOUT_PASSWORD in .env, then config:clear';
        }

        $currency = (string) config('nowpayments.payouts.currency', 'usdtbsc');

        return "All member withdrawals are paid via NOWPayments Mass Payout (USDT BEP-20) · currency {$currency} · IPN ".url('/api/payments/nowpayments/ipn');
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('nowPaymentsBalance')
                ->label('NP custody balance')
                ->icon(Heroicon::OutlinedWallet)
                ->color('gray')
                ->visible(fn (): bool => (bool) config('nowpayments.payouts.enabled'))
                ->action(function (): void {
                    try {
                        $balance = app(NowPaymentsMassPayoutClient::class)->getBalance();
                        Notification::make()
                            ->title('NOWPayments balance')
                            ->body(Str::limit(json_encode($balance, JSON_PRETTY_PRINT), 4000))
                            ->success()
                            ->duration(20000)
                            ->send();
                    } catch (Throwable $e) {
                        report($e);
                        Notification::make()
                            ->title('Balance check failed')
                            ->body($e->getMessage())
                            ->danger()
                            ->send();
                    }
                }),
        ];
    }
}

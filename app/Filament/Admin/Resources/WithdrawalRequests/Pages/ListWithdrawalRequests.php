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
        $enabled = config('nowpayments.payouts.enabled') ? 'ON' : 'OFF';
        $currency = (string) config('nowpayments.payouts.currency', 'usdtbsc');

        return "Process member USDT BEP-20 withdrawals via NOWPayments Mass Payout API · Payouts {$enabled} · currency {$currency}";
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

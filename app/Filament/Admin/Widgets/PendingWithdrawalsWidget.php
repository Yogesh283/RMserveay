<?php

namespace App\Filament\Admin\Widgets;

use App\Filament\Admin\Resources\WithdrawalRequests\WithdrawalRequestResource;
use App\Models\WalletTransaction;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class PendingWithdrawalsWidget extends StatsOverviewWidget
{
    protected static ?int $sort = 6;

    protected function getStats(): array
    {
        $queued = WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_WITHDRAWAL)
            ->where(function ($q): void {
                $q->where('meta->status', 'queued')
                    ->orWhereNull('meta->status');
            })
            ->count();

        $awaiting2fa = WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_WITHDRAWAL)
            ->where('meta->status', 'np_creating')
            ->count();

        $payoutsOn = (bool) config('nowpayments.payouts.enabled');

        return [
            Stat::make('Withdrawals queued', number_format($queued))
                ->description($payoutsOn
                    ? 'Send via NOWPayments from Withdrawals menu'
                    : 'Enable NOWPAYMENTS_PAYOUTS_ENABLED in .env')
                ->color($queued > 0 ? 'warning' : 'gray')
                ->url(WithdrawalRequestResource::getUrl('index')),
            Stat::make('Awaiting NP 2FA', number_format($awaiting2fa))
                ->description('Submitted — verify with master account code')
                ->color($awaiting2fa > 0 ? 'info' : 'gray')
                ->url(WithdrawalRequestResource::getUrl('index')),
        ];
    }
}

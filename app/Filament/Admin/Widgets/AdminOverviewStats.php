<?php

namespace App\Filament\Admin\Widgets;

use App\Models\MatchingPayout;
use App\Models\User;
use App\Models\WalletTransaction;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Carbon;

class AdminOverviewStats extends StatsOverviewWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $today = Carbon::today();
        $closingDate = Carbon::now(config('binary_closing.timezone', 'Asia/Kolkata'))->toDateString();

        $todayPayoutTotal = (float) (MatchingPayout::query()
            ->whereDate('closing_date', $closingDate)
            ->sum('payout_usd') ?? 0);
        $todayPayoutCount = MatchingPayout::query()
            ->whereDate('closing_date', $closingDate)
            ->count();
        $totalPayoutUsd = (float) (MatchingPayout::query()->sum('payout_usd') ?? 0);

        $totalUsers = User::query()->count();
        $todayUsers = User::query()->whereDate('created_at', $today)->count();

        $totalDepositUsd = (float) (WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_DEPOSIT_CREDIT)
            ->sum('amount') ?? 0);

        $totalSubPanelsUsed = (int) (User::query()->sum('sub_panel_count') ?? 0);
        $todaySubPanelsUsed = WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_SUB_PANEL_FEE)
            ->whereDate('created_at', $today)
            ->count();

        $totalSuperSubPanelsUsed = (int) (User::query()->sum('super_sub_panel_count') ?? 0);
        $todaySuperSubPanelsUsed = WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_SUPER_SUB_PANEL_FEE)
            ->whereDate('created_at', $today)
            ->count();

        return [
            Stat::make('Today Payout (USD)', '$'.number_format($todayPayoutTotal, 2))
                ->description("{$todayPayoutCount} members · closing {$closingDate}")
                ->color('success'),
            Stat::make('Total Payout (USD)', '$'.number_format($totalPayoutUsd, 2))
                ->description('All-time matching paid'),
            Stat::make('Total Users', number_format($totalUsers)),
            Stat::make('Today Users', number_format($todayUsers)),
            Stat::make('Total Deposit (USD)', '$'.number_format($totalDepositUsd, 2)),
            Stat::make('Total Sub Panel Used', number_format($totalSubPanelsUsed)),
            Stat::make('Today Sub Panel Used', number_format($todaySubPanelsUsed)),
            Stat::make('Total Super Panel Used', number_format($totalSuperSubPanelsUsed)),
            Stat::make('Today Super Panel Used', number_format($todaySuperSubPanelsUsed)),
        ];
    }
}


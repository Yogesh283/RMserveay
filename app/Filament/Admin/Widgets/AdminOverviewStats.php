<?php

namespace App\Filament\Admin\Widgets;

use App\Models\ActivePanelUser;
use App\Models\MatchingPayout;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Support\BinaryClosingCalendar;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class AdminOverviewStats extends StatsOverviewWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $tz = BinaryClosingCalendar::timezone();
        $closingYesterday = BinaryClosingCalendar::yesterdayDateString();
        $closingToday = BinaryClosingCalendar::todayDateString();
        [$todayStart, $todayEnd] = BinaryClosingCalendar::todayLocalBounds();

        $yesterdayPayoutTotal = (float) (MatchingPayout::query()
            ->whereDate('closing_date', $closingYesterday)
            ->sum('payout_usd') ?? 0);
        $yesterdayPayoutCount = MatchingPayout::query()
            ->whereDate('closing_date', $closingYesterday)
            ->count();

        $todayClosingPayoutTotal = (float) (MatchingPayout::query()
            ->whereDate('closing_date', $closingToday)
            ->sum('payout_usd') ?? 0);
        $todayClosingPayoutCount = MatchingPayout::query()
            ->whereDate('closing_date', $closingToday)
            ->count();

        $totalPayoutUsd = (float) (MatchingPayout::query()->sum('payout_usd') ?? 0);

        $totalUsers = User::query()->count();
        $todayUsers = User::query()
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        $totalDepositUsd = (float) (WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_DEPOSIT_CREDIT)
            ->sum('amount') ?? 0);

        $totalActivePanelists = ActivePanelUser::query()->count();
        $todayActivePanelists = ActivePanelUser::query()
            ->whereBetween('activated_at', [$todayStart, $todayEnd])
            ->count();

        $totalSubPanelsUsed = (int) (User::query()->sum('sub_panel_count') ?? 0);
        $todaySubPanelsUsed = WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_SUB_PANEL_FEE)
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        $totalSuperSubPanelsUsed = (int) (User::query()->sum('super_sub_panel_count') ?? 0);
        $todaySuperSubPanelsUsed = WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_SUPER_SUB_PANEL_FEE)
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        return [
            Stat::make('Yesterday closing payout (USD)', '$'.number_format($yesterdayPayoutTotal, 2))
                ->description("{$yesterdayPayoutCount} payouts · closing date {$closingYesterday} · {$tz}")
                ->color('success'),
            Stat::make('Today closing payout (USD)', '$'.number_format($todayClosingPayoutTotal, 2))
                ->description("{$todayClosingPayoutCount} payouts · closing date {$closingToday} (only if you run closing with --date=today)")
                ->color('gray'),
            Stat::make('Total payout (USD)', '$'.number_format($totalPayoutUsd, 2))
                ->description('All-time matching paid'),
            Stat::make('Active panelists', number_format($totalActivePanelists))
                ->description("{$todayActivePanelists} activated today · {$tz}"),
            Stat::make('Sub panel slots (total)', number_format($totalSubPanelsUsed))
                ->description("{$todaySubPanelsUsed} purchases today · {$tz}"),
            Stat::make('Super sub slots (total)', number_format($totalSuperSubPanelsUsed))
                ->description("{$todaySuperSubPanelsUsed} purchases today · {$tz}"),
            Stat::make('Total users', number_format($totalUsers)),
            Stat::make('Today users', number_format($todayUsers))
                ->description("Joined today · {$tz}"),
            Stat::make('Total deposit (USD)', '$'.number_format($totalDepositUsd, 2)),
        ];
    }
}


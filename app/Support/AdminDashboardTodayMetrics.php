<?php

namespace App\Support;

use App\Models\SurveyResponse;
use App\Models\User;
use App\Models\WalletTransaction;
final class AdminDashboardTodayMetrics
{
    /**
     * @return array{0: \Illuminate\Support\Carbon, 1: \Illuminate\Support\Carbon}
     */
    public static function todayBounds(): array
    {
        return BinaryClosingCalendar::todayLocalBounds();
    }

    public static function todayRegistrationsCount(): int
    {
        [$start, $end] = self::todayBounds();

        return User::query()
            ->whereBetween('created_at', [$start, $end])
            ->count();
    }

    /** Users who became active panelists today ($10 minimum panel paid). */
    public static function todayActivePanelistsCount(): int
    {
        [$start, $end] = self::todayBounds();

        return User::query()
            ->whereBetween('minimum_panel_fee_paid_at', [$start, $end])
            ->count();
    }

    /**
     * @return array{count:int, total_usd:float}
     */
    public static function todayDeposits(): array
    {
        [$start, $end] = self::todayBounds();

        $row = WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_DEPOSIT_CREDIT)
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('COUNT(*) AS c, COALESCE(SUM(amount),0) AS s')
            ->first();

        return [
            'count' => (int) ($row->c ?? 0),
            'total_usd' => (float) ($row->s ?? 0),
        ];
    }

    /**
     * @return array{completions:int, distinct_users:int, credited_usd:float}
     */
    public static function todaySurveyActivity(): array
    {
        [$start, $end] = self::todayBounds();

        $completions = SurveyResponse::query()
            ->where('completed', true)
            ->whereBetween('updated_at', [$start, $end])
            ->count();

        $distinctUsers = (int) SurveyResponse::query()
            ->where('completed', true)
            ->whereBetween('updated_at', [$start, $end])
            ->whereNotNull('respondent_user_id')
            ->selectRaw('COUNT(DISTINCT respondent_user_id) AS aggregate')
            ->value('aggregate');

        $credited = WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_SURVEY_CREDIT)
            ->whereBetween('created_at', [$start, $end])
            ->sum('amount');

        return [
            'completions' => $completions,
            'distinct_users' => $distinctUsers,
            'credited_usd' => (float) ($credited ?? 0),
        ];
    }

    /**
     * @return array{active_panel:int, sub_purchases:int, sub_users:int, super_purchases:int, super_users:int}
     */
    public static function todayPanelPurchases(): array
    {
        [$start, $end] = self::todayBounds();

        $activePanel = User::query()
            ->whereBetween('minimum_panel_fee_paid_at', [$start, $end])
            ->count();

        $subPurchases = WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_SUB_PANEL_FEE)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $subUsers = WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_SUB_PANEL_FEE)
            ->whereBetween('created_at', [$start, $end])
            ->distinct('user_id')
            ->count('user_id');

        $superPurchases = WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_SUPER_SUB_PANEL_FEE)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $superUsers = WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_SUPER_SUB_PANEL_FEE)
            ->whereBetween('created_at', [$start, $end])
            ->distinct('user_id')
            ->count('user_id');

        return [
            'active_panel' => $activePanel,
            'sub_purchases' => $subPurchases,
            'sub_users' => $subUsers,
            'super_purchases' => $superPurchases,
            'super_users' => $superUsers,
        ];
    }
}

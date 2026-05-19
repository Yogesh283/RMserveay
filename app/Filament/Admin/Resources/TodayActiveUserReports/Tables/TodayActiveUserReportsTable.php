<?php

namespace App\Filament\Admin\Resources\TodayActiveUserReports\Tables;

use App\Filament\Admin\Support\AdminUserReportsTableColumns;
use Filament\Tables\Table;

class TodayActiveUserReportsTable
{
    public static function configure(Table $table): Table
    {
        return AdminUserReportsTableColumns::applyActiveColumns($table)
            ->defaultSort('minimum_panel_fee_paid_at', 'desc')
            ->recordUrl(AdminUserReportsTableColumns::defaultRecordUrl());
    }
}

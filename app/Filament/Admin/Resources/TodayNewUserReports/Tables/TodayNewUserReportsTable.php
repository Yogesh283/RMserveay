<?php

namespace App\Filament\Admin\Resources\TodayNewUserReports\Tables;

use App\Filament\Admin\Support\AdminUserReportsTableColumns;
use Filament\Tables\Table;

class TodayNewUserReportsTable
{
    public static function configure(Table $table): Table
    {
        return AdminUserReportsTableColumns::applyRegistrationColumns($table)
            ->defaultSort('created_at', 'desc')
            ->recordUrl(AdminUserReportsTableColumns::defaultRecordUrl());
    }
}

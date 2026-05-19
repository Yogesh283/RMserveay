<?php

namespace App\Filament\Admin\Resources\TodayActiveUserReports;

use App\Filament\Admin\Resources\TodayActiveUserReports\Pages\ListTodayActiveUserReports;
use App\Filament\Admin\Resources\TodayActiveUserReports\Tables\TodayActiveUserReportsTable;
use App\Models\User;
use App\Support\BinaryClosingCalendar;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use UnitEnum;

class TodayActiveUserReportResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationLabel = 'Today Active Users';

    protected static string|UnitEnum|null $navigationGroup = 'Reports';

    protected static ?int $navigationSort = 6;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedSignal;

    public static function form(Schema $schema): Schema
    {
        return $schema;
    }

    public static function table(Table $table): Table
    {
        return TodayActiveUserReportsTable::configure($table);
    }

    /** Users who paid the $10 active panel fee today (app closing timezone). */
    public static function getEloquentQuery(): Builder
    {
        [$start, $end] = BinaryClosingCalendar::todayLocalBounds();

        return parent::getEloquentQuery()
            ->with('sponsor:id,login_uid,name')
            ->whereBetween('minimum_panel_fee_paid_at', [$start, $end]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListTodayActiveUserReports::route('/'),
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function canDelete(Model $record): bool
    {
        return false;
    }
}

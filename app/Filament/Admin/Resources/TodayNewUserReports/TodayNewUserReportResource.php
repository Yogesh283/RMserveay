<?php

namespace App\Filament\Admin\Resources\TodayNewUserReports;

use App\Filament\Admin\Resources\TodayNewUserReports\Pages\ListTodayNewUserReports;
use App\Filament\Admin\Resources\TodayNewUserReports\Tables\TodayNewUserReportsTable;
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

class TodayNewUserReportResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationLabel = 'Today Registration';

    protected static string|UnitEnum|null $navigationGroup = 'Reports';

    protected static ?int $navigationSort = 2;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedUserPlus;

    public static function form(Schema $schema): Schema
    {
        return $schema;
    }

    public static function table(Table $table): Table
    {
        return TodayNewUserReportsTable::configure($table);
    }

    public static function getEloquentQuery(): Builder
    {
        [$start, $end] = BinaryClosingCalendar::todayLocalBounds();

        return parent::getEloquentQuery()
            ->with('sponsor:id,login_uid,name')
            ->whereBetween('created_at', [$start, $end]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListTodayNewUserReports::route('/'),
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

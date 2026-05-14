<?php

namespace App\Filament\Admin\Resources\TodayActiveUserReports;

use App\Filament\Admin\Resources\TodayActiveUserReports\Pages\ListTodayActiveUserReports;
use App\Filament\Admin\Resources\TodayActiveUserReports\Tables\TodayActiveUserReportsTable;
use App\Models\User;
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

    protected static ?string $navigationLabel = 'Today active';

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

    public static function getEloquentQuery(): Builder
    {
        $start = now()->startOfDay()->timestamp;

        return parent::getEloquentQuery()
            ->where('user_type', 'normal')
            ->where(function (Builder $q) use ($start): void {
                $q->whereDate('created_at', today())
                    ->orWhereExists(function ($sub) use ($start): void {
                        $sub->selectRaw('1')
                            ->from('sessions')
                            ->whereColumn('sessions.user_id', 'users.id')
                            ->where('sessions.last_activity', '>=', $start);
                    })
                    ->orWhereExists(function ($sub): void {
                        $sub->selectRaw('1')
                            ->from('wallet_transactions')
                            ->whereColumn('wallet_transactions.user_id', 'users.id')
                            ->whereDate('wallet_transactions.created_at', today());
                    })
                    ->orWhereExists(function ($sub): void {
                        $sub->selectRaw('1')
                            ->from('survey_responses')
                            ->whereColumn('survey_responses.respondent_user_id', 'users.id')
                            ->whereDate('survey_responses.created_at', today());
                    });
            });
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

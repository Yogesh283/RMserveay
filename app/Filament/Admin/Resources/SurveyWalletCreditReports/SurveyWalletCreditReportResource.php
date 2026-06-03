<?php

namespace App\Filament\Admin\Resources\SurveyWalletCreditReports;

use App\Filament\Admin\Resources\SurveyWalletCreditReports\Pages\ListSurveyWalletCreditReports;
use App\Filament\Admin\Resources\SurveyWalletCreditReports\Tables\SurveyWalletCreditReportsTable;
use App\Models\WalletTransaction;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use UnitEnum;

class SurveyWalletCreditReportResource extends Resource
{
    protected static ?string $model = WalletTransaction::class;

    protected static ?string $navigationLabel = 'Survey wallet credits';

    protected static ?string $modelLabel = 'survey wallet credit';

    protected static ?string $pluralModelLabel = 'survey wallet credits';

    protected static string|UnitEnum|null $navigationGroup = 'Reports';

    protected static ?int $navigationSort = 6;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBanknotes;

    public static function form(Schema $schema): Schema
    {
        return $schema;
    }

    public static function table(Table $table): Table
    {
        return SurveyWalletCreditReportsTable::configure($table);
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->with('user')
            ->where('type', WalletTransaction::TYPE_SURVEY_CREDIT)
            ->where(function (Builder $query): void {
                $query->where('meta->earner_wallet_credited', true)
                    ->orWhereNull('meta->earner_wallet_credited');
            });
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListSurveyWalletCreditReports::route('/'),
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

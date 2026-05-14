<?php

namespace App\Filament\Admin\Resources\MatchingReports;

use App\Filament\Admin\Resources\MatchingReports\Pages\ListMatchingReports;
use App\Filament\Admin\Resources\MatchingReports\Tables\MatchingReportsTable;
use App\Models\BinaryDailyClosing;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;
use UnitEnum;

class MatchingReportResource extends Resource
{
    protected static ?string $model = BinaryDailyClosing::class;

    protected static ?string $navigationLabel = 'Matching report';

    protected static string|UnitEnum|null $navigationGroup = 'Reports';

    protected static ?int $navigationSort = 3;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedArrowsRightLeft;

    public static function form(Schema $schema): Schema
    {
        return $schema;
    }

    public static function table(Table $table): Table
    {
        return MatchingReportsTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListMatchingReports::route('/'),
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

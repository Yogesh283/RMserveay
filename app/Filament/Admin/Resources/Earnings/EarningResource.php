<?php

namespace App\Filament\Admin\Resources\Earnings;

use App\Filament\Admin\Resources\Earnings\Pages\CreateEarning;
use App\Filament\Admin\Resources\Earnings\Pages\EditEarning;
use App\Filament\Admin\Resources\Earnings\Pages\ListEarnings;
use App\Filament\Admin\Resources\Earnings\Pages\ViewEarning;
use App\Filament\Admin\Resources\Earnings\Schemas\EarningForm;
use App\Filament\Admin\Resources\Earnings\Schemas\EarningInfolist;
use App\Filament\Admin\Resources\Earnings\Tables\EarningsTable;
use App\Models\Earning;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class EarningResource extends Resource
{
    protected static ?string $model = Earning::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    public static function form(Schema $schema): Schema
    {
        return EarningForm::configure($schema);
    }

    public static function infolist(Schema $schema): Schema
    {
        return EarningInfolist::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return EarningsTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListEarnings::route('/'),
            'create' => CreateEarning::route('/create'),
            'view' => ViewEarning::route('/{record}'),
            'edit' => EditEarning::route('/{record}/edit'),
        ];
    }
}

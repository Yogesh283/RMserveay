<?php

namespace App\Filament\Admin\Resources\NowPaymentIntents;

use App\Filament\Admin\Resources\NowPaymentIntents\Pages\CreateNowPaymentIntent;
use App\Filament\Admin\Resources\NowPaymentIntents\Pages\EditNowPaymentIntent;
use App\Filament\Admin\Resources\NowPaymentIntents\Pages\ListNowPaymentIntents;
use App\Filament\Admin\Resources\NowPaymentIntents\Pages\ViewNowPaymentIntent;
use App\Filament\Admin\Resources\NowPaymentIntents\Schemas\NowPaymentIntentForm;
use App\Filament\Admin\Resources\NowPaymentIntents\Schemas\NowPaymentIntentInfolist;
use App\Filament\Admin\Resources\NowPaymentIntents\Tables\NowPaymentIntentsTable;
use App\Models\NowPaymentIntent;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class NowPaymentIntentResource extends Resource
{
    protected static ?string $model = NowPaymentIntent::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    public static function form(Schema $schema): Schema
    {
        return NowPaymentIntentForm::configure($schema);
    }

    public static function infolist(Schema $schema): Schema
    {
        return NowPaymentIntentInfolist::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return NowPaymentIntentsTable::configure($table);
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
            'index' => ListNowPaymentIntents::route('/'),
            'create' => CreateNowPaymentIntent::route('/create'),
            'view' => ViewNowPaymentIntent::route('/{record}'),
            'edit' => EditNowPaymentIntent::route('/{record}/edit'),
        ];
    }
}

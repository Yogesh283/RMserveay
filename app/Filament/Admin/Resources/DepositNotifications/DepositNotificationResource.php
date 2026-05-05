<?php

namespace App\Filament\Admin\Resources\DepositNotifications;

use App\Filament\Admin\Resources\DepositNotifications\Pages\CreateDepositNotification;
use App\Filament\Admin\Resources\DepositNotifications\Pages\EditDepositNotification;
use App\Filament\Admin\Resources\DepositNotifications\Pages\ListDepositNotifications;
use App\Filament\Admin\Resources\DepositNotifications\Pages\ViewDepositNotification;
use App\Filament\Admin\Resources\DepositNotifications\Schemas\DepositNotificationForm;
use App\Filament\Admin\Resources\DepositNotifications\Schemas\DepositNotificationInfolist;
use App\Filament\Admin\Resources\DepositNotifications\Tables\DepositNotificationsTable;
use App\Models\DepositNotification;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class DepositNotificationResource extends Resource
{
    protected static ?string $model = DepositNotification::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    public static function form(Schema $schema): Schema
    {
        return DepositNotificationForm::configure($schema);
    }

    public static function infolist(Schema $schema): Schema
    {
        return DepositNotificationInfolist::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return DepositNotificationsTable::configure($table);
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
            'index' => ListDepositNotifications::route('/'),
            'create' => CreateDepositNotification::route('/create'),
            'view' => ViewDepositNotification::route('/{record}'),
            'edit' => EditDepositNotification::route('/{record}/edit'),
        ];
    }
}

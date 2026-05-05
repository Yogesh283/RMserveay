<?php

namespace App\Filament\Admin\Resources\PublisherNotifications;

use App\Filament\Admin\Resources\PublisherNotifications\Pages\CreatePublisherNotification;
use App\Filament\Admin\Resources\PublisherNotifications\Pages\EditPublisherNotification;
use App\Filament\Admin\Resources\PublisherNotifications\Pages\ListPublisherNotifications;
use App\Filament\Admin\Resources\PublisherNotifications\Pages\ViewPublisherNotification;
use App\Filament\Admin\Resources\PublisherNotifications\Schemas\PublisherNotificationForm;
use App\Filament\Admin\Resources\PublisherNotifications\Schemas\PublisherNotificationInfolist;
use App\Filament\Admin\Resources\PublisherNotifications\Tables\PublisherNotificationsTable;
use App\Models\PublisherNotification;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class PublisherNotificationResource extends Resource
{
    protected static ?string $model = PublisherNotification::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    public static function form(Schema $schema): Schema
    {
        return PublisherNotificationForm::configure($schema);
    }

    public static function infolist(Schema $schema): Schema
    {
        return PublisherNotificationInfolist::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return PublisherNotificationsTable::configure($table);
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
            'index' => ListPublisherNotifications::route('/'),
            'create' => CreatePublisherNotification::route('/create'),
            'view' => ViewPublisherNotification::route('/{record}'),
            'edit' => EditPublisherNotification::route('/{record}/edit'),
        ];
    }
}

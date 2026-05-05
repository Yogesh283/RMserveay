<?php

namespace App\Filament\Admin\Resources\PublisherNotifications\Pages;

use App\Filament\Admin\Resources\PublisherNotifications\PublisherNotificationResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListPublisherNotifications extends ListRecords
{
    protected static string $resource = PublisherNotificationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}

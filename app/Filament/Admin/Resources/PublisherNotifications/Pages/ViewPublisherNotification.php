<?php

namespace App\Filament\Admin\Resources\PublisherNotifications\Pages;

use App\Filament\Admin\Resources\PublisherNotifications\PublisherNotificationResource;
use Filament\Actions\EditAction;
use Filament\Resources\Pages\ViewRecord;

class ViewPublisherNotification extends ViewRecord
{
    protected static string $resource = PublisherNotificationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            EditAction::make(),
        ];
    }
}

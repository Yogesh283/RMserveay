<?php

namespace App\Filament\Admin\Resources\PublisherNotifications\Pages;

use App\Filament\Admin\Resources\PublisherNotifications\PublisherNotificationResource;
use Filament\Actions\DeleteAction;
use Filament\Actions\ViewAction;
use Filament\Resources\Pages\EditRecord;

class EditPublisherNotification extends EditRecord
{
    protected static string $resource = PublisherNotificationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            ViewAction::make(),
            DeleteAction::make(),
        ];
    }
}

<?php

namespace App\Filament\Admin\Resources\DepositNotifications\Pages;

use App\Filament\Admin\Resources\DepositNotifications\DepositNotificationResource;
use Filament\Actions\EditAction;
use Filament\Resources\Pages\ViewRecord;

class ViewDepositNotification extends ViewRecord
{
    protected static string $resource = DepositNotificationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            EditAction::make(),
        ];
    }
}

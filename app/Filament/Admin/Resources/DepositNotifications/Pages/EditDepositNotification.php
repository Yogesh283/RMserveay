<?php

namespace App\Filament\Admin\Resources\DepositNotifications\Pages;

use App\Filament\Admin\Resources\DepositNotifications\DepositNotificationResource;
use Filament\Actions\DeleteAction;
use Filament\Actions\ViewAction;
use Filament\Resources\Pages\EditRecord;

class EditDepositNotification extends EditRecord
{
    protected static string $resource = DepositNotificationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            ViewAction::make(),
            DeleteAction::make(),
        ];
    }
}

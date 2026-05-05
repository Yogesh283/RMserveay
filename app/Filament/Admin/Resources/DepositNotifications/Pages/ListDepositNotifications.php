<?php

namespace App\Filament\Admin\Resources\DepositNotifications\Pages;

use App\Filament\Admin\Resources\DepositNotifications\DepositNotificationResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListDepositNotifications extends ListRecords
{
    protected static string $resource = DepositNotificationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}

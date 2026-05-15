<?php

namespace App\Filament\Admin\Resources\SuperSubPanelUsers\Pages;

use App\Filament\Admin\Resources\SuperSubPanelUsers\SuperSubPanelUserResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListSuperSubPanelUsers extends ListRecords
{
    protected static string $resource = SuperSubPanelUserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}

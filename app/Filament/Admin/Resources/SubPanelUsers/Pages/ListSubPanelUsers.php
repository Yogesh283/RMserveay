<?php

namespace App\Filament\Admin\Resources\SubPanelUsers\Pages;

use App\Filament\Admin\Resources\SubPanelUsers\SubPanelUserResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListSubPanelUsers extends ListRecords
{
    protected static string $resource = SubPanelUserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}

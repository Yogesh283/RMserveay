<?php

namespace App\Filament\Admin\Resources\ActivePanelUsers\Pages;

use App\Filament\Admin\Resources\ActivePanelUsers\ActivePanelUserResource;
use Filament\Resources\Pages\ListRecords;

class ListActivePanelUsers extends ListRecords
{
    protected static string $resource = ActivePanelUserResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}

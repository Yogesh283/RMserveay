<?php

namespace App\Filament\Admin\Resources\ActivePanelUsers\Pages;

use App\Filament\Admin\Resources\ActivePanelUsers\ActivePanelUserResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditActivePanelUser extends EditRecord
{
    protected static string $resource = ActivePanelUserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}

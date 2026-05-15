<?php

namespace App\Filament\Admin\Resources\SuperSubPanelUsers\Pages;

use App\Filament\Admin\Resources\SuperSubPanelUsers\SuperSubPanelUserResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditSuperSubPanelUser extends EditRecord
{
    protected static string $resource = SuperSubPanelUserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}

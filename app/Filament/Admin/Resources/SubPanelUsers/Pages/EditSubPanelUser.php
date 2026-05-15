<?php

namespace App\Filament\Admin\Resources\SubPanelUsers\Pages;

use App\Filament\Admin\Resources\SubPanelUsers\SubPanelUserResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditSubPanelUser extends EditRecord
{
    protected static string $resource = SubPanelUserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}

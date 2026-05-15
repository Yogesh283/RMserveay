<?php

namespace App\Filament\Admin\Resources\ActivePanelUsers\Pages;

use App\Filament\Admin\Resources\ActivePanelUsers\ActivePanelUserResource;
use Filament\Resources\Pages\CreateRecord;

class CreateActivePanelUser extends CreateRecord
{
    protected static string $resource = ActivePanelUserResource::class;
}

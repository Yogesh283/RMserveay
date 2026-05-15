<?php

namespace App\Filament\Admin\Resources\SubPanelUsers\Pages;

use App\Filament\Admin\Resources\SubPanelUsers\SubPanelUserResource;
use Filament\Resources\Pages\CreateRecord;

class CreateSubPanelUser extends CreateRecord
{
    protected static string $resource = SubPanelUserResource::class;
}

<?php

namespace App\Filament\Admin\Resources\Earnings\Pages;

use App\Filament\Admin\Resources\Earnings\EarningResource;
use Filament\Actions\EditAction;
use Filament\Resources\Pages\ViewRecord;

class ViewEarning extends ViewRecord
{
    protected static string $resource = EarningResource::class;

    protected function getHeaderActions(): array
    {
        return [
            EditAction::make(),
        ];
    }
}

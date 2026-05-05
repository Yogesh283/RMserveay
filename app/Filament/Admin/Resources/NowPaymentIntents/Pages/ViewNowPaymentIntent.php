<?php

namespace App\Filament\Admin\Resources\NowPaymentIntents\Pages;

use App\Filament\Admin\Resources\NowPaymentIntents\NowPaymentIntentResource;
use Filament\Actions\EditAction;
use Filament\Resources\Pages\ViewRecord;

class ViewNowPaymentIntent extends ViewRecord
{
    protected static string $resource = NowPaymentIntentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            EditAction::make(),
        ];
    }
}

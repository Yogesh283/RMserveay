<?php

namespace App\Filament\Admin\Resources\NowPaymentIntents\Pages;

use App\Filament\Admin\Resources\NowPaymentIntents\NowPaymentIntentResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListNowPaymentIntents extends ListRecords
{
    protected static string $resource = NowPaymentIntentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}

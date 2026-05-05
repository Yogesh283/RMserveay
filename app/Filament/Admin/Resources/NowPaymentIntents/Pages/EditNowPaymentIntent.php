<?php

namespace App\Filament\Admin\Resources\NowPaymentIntents\Pages;

use App\Filament\Admin\Resources\NowPaymentIntents\NowPaymentIntentResource;
use Filament\Actions\DeleteAction;
use Filament\Actions\ViewAction;
use Filament\Resources\Pages\EditRecord;

class EditNowPaymentIntent extends EditRecord
{
    protected static string $resource = NowPaymentIntentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            ViewAction::make(),
            DeleteAction::make(),
        ];
    }
}

<?php

namespace App\Filament\Admin\Resources\WithdrawalRequests\Pages;

use App\Filament\Admin\Resources\WithdrawalRequests\WithdrawalPayoutActions;
use App\Filament\Admin\Resources\WithdrawalRequests\WithdrawalRequestResource;
use Filament\Resources\Pages\ViewRecord;

class ViewWithdrawalRequest extends ViewRecord
{
    protected static string $resource = WithdrawalRequestResource::class;

    protected function getHeaderActions(): array
    {
        return WithdrawalPayoutActions::make();
    }
}

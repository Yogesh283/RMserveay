<?php

namespace App\Filament\Admin\Resources\Users\Pages;

use App\Filament\Admin\Resources\Users\Tables\UsersTable;
use App\Filament\Admin\Resources\Users\UserResource;
use Filament\Actions\ActionGroup;
use Filament\Actions\EditAction;
use Filament\Resources\Pages\ViewRecord;
use Filament\Support\Icons\Heroicon;

class ViewUser extends ViewRecord
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            UsersTable::loginAsMemberAction(),
            ActionGroup::make([
                UsersTable::activateActivationFeeAction(),
                UsersTable::activateMinimumPanelAction(),
                UsersTable::addOneSubPanelAction(),
                UsersTable::addOneSuperSubPanelAction(),
            ])
                ->label('Activate panels')
                ->icon(Heroicon::OutlinedCheckBadge)
                ->color('success')
                ->button(),
            EditAction::make(),
        ];
    }
}

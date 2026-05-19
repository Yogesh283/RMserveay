<?php

namespace App\Filament\Admin\Resources\Users\Pages;

use App\Filament\Admin\Resources\Users\UserResource;
use App\Services\AdminMemberAccountService;
use Filament\Actions\DeleteAction;
use Filament\Actions\ViewAction;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Validation\ValidationException;

class EditUser extends EditRecord
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            ViewAction::make(),
            DeleteAction::make(),
        ];
    }

    protected function afterSave(): void
    {
        $user = $this->record;

        if (! $user->wasChanged('minimum_panel_fee_paid_at')) {
            return;
        }

        if ($user->minimum_panel_fee_paid_at === null) {
            return;
        }

        if ($user->getOriginal('minimum_panel_fee_paid_at') !== null) {
            return;
        }

        if ($user->activation_fee_paid_at === null) {
            Notification::make()
                ->title('Active panel matching not run')
                ->body('Set activation fee paid first, or use “Mark active panel paid ($10)” on the member view.')
                ->warning()
                ->send();

            return;
        }

        try {
            app(AdminMemberAccountService::class)->finalizeActivePanelActivation($user->fresh());
        } catch (ValidationException $e) {
            $msg = collect($e->errors())->flatten()->first() ?? $e->getMessage();
            Notification::make()
                ->title('Active panel matching failed')
                ->body((string) $msg)
                ->danger()
                ->send();
        }
    }
}

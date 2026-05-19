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
        $service = app(AdminMemberAccountService::class);

        if ($user->wasChanged('minimum_panel_fee_paid_at')
            && $user->minimum_panel_fee_paid_at !== null
            && $user->getOriginal('minimum_panel_fee_paid_at') === null) {
            if ($user->activation_fee_paid_at === null) {
                Notification::make()
                    ->title('Active panel matching not run')
                    ->body('Set activation fee paid first, or use “Mark active panel paid ($10)” on the member view.')
                    ->warning()
                    ->send();
            } else {
                try {
                    $service->finalizeActivePanelActivation($user->fresh());
                } catch (ValidationException $e) {
                    $this->notifyValidationError('Active panel matching failed', $e);
                }
            }
        }

        if ($user->wasChanged('sub_panel_count')) {
            try {
                $service->syncSubPanelCarriesFromCountIncrease(
                    $user->fresh(),
                    (int) $user->getOriginal('sub_panel_count'),
                );
            } catch (ValidationException $e) {
                $this->notifyValidationError('Sub-panel carry sync failed', $e);
            }
        }

        if ($user->wasChanged('super_sub_panel_count')) {
            try {
                $service->syncSuperSubPanelCarriesFromCountIncrease(
                    $user->fresh(),
                    (int) $user->getOriginal('super_sub_panel_count'),
                );
            } catch (ValidationException $e) {
                $this->notifyValidationError('Super sub-panel carry sync failed', $e);
            }
        }
    }

    protected function notifyValidationError(string $title, ValidationException $e): void
    {
        $msg = collect($e->errors())->flatten()->first() ?? $e->getMessage();
        Notification::make()
            ->title($title)
            ->body((string) $msg)
            ->danger()
            ->send();
    }
}

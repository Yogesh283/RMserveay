<?php

namespace App\Filament\Admin\Resources\ActivePanelUsers\Pages;

use App\Filament\Admin\Resources\ActivePanelUsers\ActivePanelUserResource;
use App\Models\ActivePanelUser;
use App\Models\User;
use App\Services\AdminMemberAccountService;
use App\Services\PanelEnrollmentService;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Validation\ValidationException;

class CreateActivePanelUser extends CreateRecord
{
    protected static string $resource = ActivePanelUserResource::class;

    protected function afterCreate(): void
    {
        /** @var ActivePanelUser $activePanel */
        $activePanel = $this->record;
        $user = User::query()->find($activePanel->user_id);
        if ($user === null) {
            return;
        }

        $service = app(AdminMemberAccountService::class);

        try {
            if ($user->activation_fee_paid_at === null) {
                $service->activateActivationFee($user);
                $user = $user->fresh();
            }

            if ($user->minimum_panel_fee_paid_at === null) {
                $service->activateMinimumPanel($user);

                return;
            }

            app(PanelEnrollmentService::class)->recordActivePanelActivation(
                $user,
                $activePanel->activated_at,
                (string) $activePanel->total_paid_usd,
            );

            Notification::make()
                ->title('Active panel snapshot saved')
                ->body('Member already had minimum panel paid — binary carries were not re-added. If upline matching is missing, run: php artisan binary:backfill-active-panel-carries')
                ->warning()
                ->send();
        } catch (ValidationException $e) {
            $msg = collect($e->errors())->flatten()->first() ?? $e->getMessage();
            Notification::make()
                ->title('Could not sync member active panel')
                ->body((string) $msg)
                ->danger()
                ->send();
        }
    }
}

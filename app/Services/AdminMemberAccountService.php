<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class AdminMemberAccountService
{
    public function __construct(
        protected PanelEnrollmentService $panelEnrollment,
    ) {}

    /**
     * Mark member fully active: activation + minimum panel + max sub + max super panels (no wallet debit).
     */
    public function activateAllPanels(User $user): User
    {
        return DB::transaction(function () use ($user) {
            /** @var User $user */
            $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $now = now();

            if ($user->activation_fee_paid_at === null) {
                $user->activation_fee_paid_at = $now;
            }

            $wasActive = $user->minimum_panel_fee_paid_at !== null;

            if ($user->minimum_panel_fee_paid_at === null) {
                $user->minimum_panel_fee_paid_at = $now;
            }

            $maxSub = (int) config('self_survey.max_sub_panels', 9);
            $maxSuper = (int) config('self_survey.max_super_sub_panels', 9);

            if ((int) $user->sub_panel_count < $maxSub) {
                $user->sub_panel_count = $maxSub;
            }

            if ((int) $user->super_sub_panel_count < $maxSuper) {
                $user->super_sub_panel_count = $maxSuper;
            }

            $user->save();

            $user = $user->fresh();

            $this->panelEnrollment->recordActivePanelActivation($user);

            if (! $wasActive) {
                app(ActivePanelMatchingService::class)->processActivePanelActivation($user);
            }

            $this->panelEnrollment->recordSubPanelPurchase($user);
            $this->panelEnrollment->recordSuperSubPanelPurchase($user);

            return $user->fresh();
        });
    }

    public function blockAccount(User $user): User
    {
        $user->account_blocked_at = now();
        $user->save();

        return $user->fresh();
    }

    public function unblockAccount(User $user): User
    {
        $user->account_blocked_at = null;
        $user->save();

        return $user->fresh();
    }
}

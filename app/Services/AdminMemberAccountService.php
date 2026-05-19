<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminMemberAccountService
{
    public function __construct(
        protected PanelEnrollmentService $panelEnrollment,
        protected ActivePanelMatchingService $activePanelMatching,
        protected PanelMatchingService $panelMatching,
        protected SuperSubPanelMatchingService $superSubPanelMatching,
    ) {}

    /** Activation fee ($1) — no wallet debit. */
    public function activateActivationFee(User $user): User
    {
        return DB::transaction(function () use ($user) {
            /** @var User $user */
            $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($user->activation_fee_paid_at !== null) {
                throw ValidationException::withMessages([
                    'user' => ['Activation fee is already marked paid for this member.'],
                ]);
            }

            $user->activation_fee_paid_at = now();
            $user->save();

            return $user->fresh();
        });
    }

    /** Minimum / active panel fee ($10) — no wallet debit. */
    public function activateMinimumPanel(User $user): User
    {
        return DB::transaction(function () use ($user) {
            /** @var User $user */
            $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($user->activation_fee_paid_at === null) {
                throw ValidationException::withMessages([
                    'user' => ['Mark activation fee paid first.'],
                ]);
            }

            if ($user->minimum_panel_fee_paid_at !== null) {
                throw ValidationException::withMessages([
                    'user' => ['Minimum panel is already marked paid for this member.'],
                ]);
            }

            $user->minimum_panel_fee_paid_at = now();
            $user->save();

            $user = $user->fresh();

            $this->finalizeActivePanelActivation($user);

            return $user->fresh();
        });
    }

    /**
     * Snapshot + upline carry after a user becomes an active panelist.
     * Call only when minimum_panel_fee_paid_at transitions from null → set.
     */
    public function finalizeActivePanelActivation(User $user): void
    {
        $this->panelEnrollment->recordActivePanelActivation($user);
        $this->activePanelMatching->processActivePanelActivation($user);
    }

    /** Add one sub-panel slot (up to max) — no wallet debit. */
    public function addOneSubPanel(User $user): User
    {
        return DB::transaction(function () use ($user) {
            /** @var User $user */
            $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($user->minimum_panel_fee_paid_at === null) {
                throw ValidationException::withMessages([
                    'user' => ['Mark minimum / active panel paid before adding sub-panels.'],
                ]);
            }

            $max = (int) config('self_survey.max_sub_panels', 9);
            if ((int) $user->sub_panel_count >= $max) {
                throw ValidationException::withMessages([
                    'user' => ['Maximum sub-panels ('.$max.') already reached.'],
                ]);
            }

            $user->sub_panel_count = (int) $user->sub_panel_count + 1;
            $user->save();

            $user = $user->fresh();

            $this->panelEnrollment->recordSubPanelPurchase($user);
            $this->panelMatching->processSubPanelPurchase($user);

            return $user->fresh();
        });
    }

    /**
     * When admin raises sub_panel_count (e.g. via user edit), award upline carries
     * for each new panel — same as repeated “Add sub-panel” clicks.
     */
    public function syncSubPanelCarriesFromCountIncrease(User $user, int $previousCount): void
    {
        $delta = (int) $user->sub_panel_count - max(0, $previousCount);
        if ($delta <= 0) {
            return;
        }

        for ($i = 0; $i < $delta; $i++) {
            $this->panelMatching->processSubPanelPurchase($user->fresh());
        }
    }

    /** Add one super sub-panel slot (up to max) — no wallet debit. */
    public function addOneSuperSubPanel(User $user): User
    {
        return DB::transaction(function () use ($user) {
            /** @var User $user */
            $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($user->minimum_panel_fee_paid_at === null) {
                throw ValidationException::withMessages([
                    'user' => ['Mark minimum / active panel paid before adding super sub-panels.'],
                ]);
            }

            $max = (int) config('self_survey.max_super_sub_panels', 9);
            if ((int) $user->super_sub_panel_count >= $max) {
                throw ValidationException::withMessages([
                    'user' => ['Maximum super sub-panels ('.$max.') already reached.'],
                ]);
            }

            $user->super_sub_panel_count = (int) $user->super_sub_panel_count + 1;
            $user->save();

            $user = $user->fresh();

            $this->panelEnrollment->recordSuperSubPanelPurchase($user);
            $this->superSubPanelMatching->processSuperSubPanelPurchase($user);

            return $user->fresh();
        });
    }

    /** When admin raises super_sub_panel_count via user edit. */
    public function syncSuperSubPanelCarriesFromCountIncrease(User $user, int $previousCount): void
    {
        $delta = (int) $user->super_sub_panel_count - max(0, $previousCount);
        if ($delta <= 0) {
            return;
        }

        for ($i = 0; $i < $delta; $i++) {
            $this->superSubPanelMatching->processSuperSubPanelPurchase($user->fresh());
        }
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

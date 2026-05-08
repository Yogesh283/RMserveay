<?php

namespace App\Services;

use App\Models\ActivePanelUser;
use App\Models\SubPanelUser;
use App\Models\SuperSubPanelUser;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * Maintains the snapshot tables (active_panel_users, sub_panel_users,
 * super_sub_panel_users) whenever a user activates or buys a new panel.
 *
 * Wallet transactions remain the per-event ledger; these snapshots answer
 * "who is currently active / how many panels do they own / when was the
 * last purchase" without scanning the wallet log.
 *
 * All upserts are idempotent — calling them more than once for the same
 * activation does NOT inflate counters or paid totals (we use scalar
 * setters where appropriate, not increments).
 */
class PanelEnrollmentService
{
    /**
     * Mark the user as an active panelist. Called from MemberProgrammeController
     * @ payMinimumPanel(), and from the backfill command.
     */
    public function recordActivePanelActivation(User $user, ?CarbonInterface $activatedAt = null, ?string $totalPaidUsd = null): ActivePanelUser
    {
        $activatedAt ??= $user->minimum_panel_fee_paid_at ?? Carbon::now();
        $totalPaidUsd ??= $this->defaultActivePanelPrice();

        return ActivePanelUser::updateOrCreate(
            ['user_id' => $user->id],
            [
                'activated_at' => Carbon::instance($activatedAt),
                'total_paid_usd' => $totalPaidUsd,
            ],
        );
    }

    /**
     * Update the sub-panel snapshot to reflect a freshly purchased sub panel.
     * Reads the authoritative count from `users.sub_panel_count` so the row
     * is always in sync even if invoked twice.
     */
    public function recordSubPanelPurchase(User $user, ?CarbonInterface $purchasedAt = null): SubPanelUser
    {
        $purchasedAt = Carbon::instance($purchasedAt ?? Carbon::now());
        $count = (int) $user->sub_panel_count;
        $price = (string) config('self_survey.sub_panel_entry_fee', '10');
        $totalPaid = bcmul((string) $count, $price, 2);

        $row = SubPanelUser::firstOrNew(['user_id' => $user->id]);
        $row->panels_count = $count;
        $row->first_purchased_at ??= $purchasedAt;
        $row->last_purchased_at = $purchasedAt;
        $row->total_paid_usd = $totalPaid;
        $row->save();

        return $row;
    }

    /**
     * Update the super-sub-panel snapshot to reflect a freshly purchased super
     * panel. Same idempotency contract as recordSubPanelPurchase().
     */
    public function recordSuperSubPanelPurchase(User $user, ?CarbonInterface $purchasedAt = null): SuperSubPanelUser
    {
        $purchasedAt = Carbon::instance($purchasedAt ?? Carbon::now());
        $count = (int) $user->super_sub_panel_count;
        $price = (string) config('self_survey.super_sub_panel_entry_fee', '100');
        $totalPaid = bcmul((string) $count, $price, 2);

        $row = SuperSubPanelUser::firstOrNew(['user_id' => $user->id]);
        $row->panels_count = $count;
        $row->first_purchased_at ??= $purchasedAt;
        $row->last_purchased_at = $purchasedAt;
        $row->total_paid_usd = $totalPaid;
        $row->save();

        return $row;
    }

    /**
     * Activation fee ($1) + minimum panel fee ($10) = $11 total spend by an
     * active panelist. Falls back to '11.00' if config keys are missing.
     */
    private function defaultActivePanelPrice(): string
    {
        $activation = (string) config('self_survey.activation_fee', '1');
        $minimum = (string) config('self_survey.minimum_panel_fee', '10');

        return bcadd($activation, $minimum, 2);
    }
}

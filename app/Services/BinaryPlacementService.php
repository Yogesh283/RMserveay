<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class BinaryPlacementService
{
    /**
     * Find the deepest "extreme left" / "extreme right" empty slot in the sponsor's
     * requested leg. Each new registration is placed at the bottom of a single chain:
     *   - side=left  → keep walking down `left_child_id` until an empty left slot is found.
     *   - side=right → keep walking down `right_child_id` until an empty right slot is found.
     * This produces an Extreme-Left / Extreme-Right auto-placement (long chain build).
     *
     * @return array{parent: User, side: 'left'|'right'}|null
     */
    public function findAvailableSlotInLeg(User $sponsor, string $side): ?array
    {
        $side = strtolower($side);
        if (! in_array($side, ['left', 'right'], true)) {
            return null;
        }

        $current = User::whereKey($sponsor->id)->lockForUpdate()->firstOrFail();

        $childField = $side === 'left' ? 'left_child_id' : 'right_child_id';

        /** Safety bound — binary trees can theoretically be unbounded depth, but cap defensively. */
        $maxDepth = 100000;
        for ($i = 0; $i < $maxDepth; $i++) {
            if ($current->{$childField} === null) {
                return ['parent' => $current, 'side' => $side];
            }

            $next = User::whereKey($current->{$childField})->lockForUpdate()->first();
            if ($next === null) {
                /** Stale pointer — treat current slot as empty so registration can proceed. */
                return ['parent' => $current, 'side' => $side];
            }

            $current = $next;
        }

        return null;
    }

    /**
     * Attach new user under the first available position in the requested sponsor leg.
     *
     * @return array{ok: bool, message?: string, parent_id?: int, binary_side?: string}
     */
    public function attachUnderSponsor(User $sponsor, User $newUser, string $side): array
    {
        $side = strtolower($side);
        if (! in_array($side, ['left', 'right'], true)) {
            return ['ok' => false, 'message' => 'Invalid placement side.'];
        }

        return DB::transaction(function () use ($sponsor, $newUser, $side) {
            $slot = $this->findAvailableSlotInLeg($sponsor, $side);
            if ($slot === null) {
                return ['ok' => false, 'message' => 'No placement slot found.'];
            }

            /** @var User $parent */
            $parent = $slot['parent'];
            $binarySide = $slot['side'];

            if ($binarySide === 'left') {
                $parent->left_child_id = $newUser->id;
            } else {
                $parent->right_child_id = $newUser->id;
            }
            $parent->save();

            $newUser->update([
                'sponsor_id' => $sponsor->id,
                'binary_parent_id' => $parent->id,
                'binary_side' => $binarySide,
            ]);

            return ['ok' => true, 'parent_id' => $parent->id, 'binary_side' => $binarySide];
        });
    }

    public function generateReferralCode(): string
    {
        do {
            $code = strtoupper(bin2hex(random_bytes(5)));
        } while (User::where('referral_code', $code)->exists());

        return $code;
    }
}

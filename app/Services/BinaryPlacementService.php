<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class BinaryPlacementService
{
    /**
     * Find the first empty binary slot inside a sponsor's requested leg.
     *
     * Direct root slot is tried first; after that the leg is traversed breadth-first
     * so new registrations keep filling the selected left/right team.
     *
     * @return array{parent: User, side: 'left'|'right'}|null
     */
    public function findAvailableSlotInLeg(User $sponsor, string $side): ?array
    {
        $side = strtolower($side);
        if (! in_array($side, ['left', 'right'], true)) {
            return null;
        }

        $locked = User::whereKey($sponsor->id)->lockForUpdate()->firstOrFail();

        if ($side === 'left') {
            if ($locked->left_child_id === null) {
                return ['parent' => $locked, 'side' => 'left'];
            }
            $queue = [(int) $locked->left_child_id];
        } else {
            if ($locked->right_child_id === null) {
                return ['parent' => $locked, 'side' => 'right'];
            }
            $queue = [(int) $locked->right_child_id];
        }

        $visited = [];
        while ($queue !== []) {
            $id = array_shift($queue);
            if (isset($visited[$id])) {
                continue;
            }
            $visited[$id] = true;

            $node = User::whereKey($id)->lockForUpdate()->first();
            if ($node === null) {
                continue;
            }

            if ($node->left_child_id === null) {
                return ['parent' => $node, 'side' => 'left'];
            }
            if ($node->right_child_id === null) {
                return ['parent' => $node, 'side' => 'right'];
            }

            $queue[] = (int) $node->left_child_id;
            $queue[] = (int) $node->right_child_id;
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

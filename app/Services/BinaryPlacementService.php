<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class BinaryPlacementService
{
    /**
     * Attach new user under sponsor on left or right leg if that slot is free.
     *
     * @return array{ok: bool, message?: string}
     */
    public function attachUnderSponsor(User $sponsor, User $newUser, string $side): array
    {
        $side = strtolower($side);
        if (! in_array($side, ['left', 'right'], true)) {
            return ['ok' => false, 'message' => 'Invalid placement side.'];
        }

        return DB::transaction(function () use ($sponsor, $newUser, $side) {
            $locked = User::whereKey($sponsor->id)->lockForUpdate()->firstOrFail();

            if ($side === 'left') {
                if ($locked->left_child_id !== null) {
                    return ['ok' => false, 'message' => 'Left position is already filled for this sponsor.'];
                }
                $locked->update(['left_child_id' => $newUser->id]);
            } else {
                if ($locked->right_child_id !== null) {
                    return ['ok' => false, 'message' => 'Right position is already filled for this sponsor.'];
                }
                $locked->update(['right_child_id' => $newUser->id]);
            }

            $newUser->update([
                'sponsor_id' => $locked->id,
                'binary_parent_id' => $locked->id,
                'binary_side' => $side,
            ]);

            return ['ok' => true];
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

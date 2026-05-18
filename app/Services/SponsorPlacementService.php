<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Validation\ValidationException;

class SponsorPlacementService
{
    public function __construct(
        protected BinaryPlacementService $binaryPlacement,
    ) {}

    /**
     * Resolve sponsor from referral code or login UID (case-insensitive for UID).
     */
    public function findSponsorByCode(string $code): ?User
    {
        $normalized = strtoupper(trim($code));
        if ($normalized === '') {
            return null;
        }

        return User::query()
            ->where(function ($q) use ($normalized) {
                $q->where('referral_code', $normalized)
                    ->orWhere('login_uid', strtolower($normalized));
            })
            ->first();
    }

    /**
     * @return array{sponsor: User, placement: array{parent: User, side: string}|null, binary_side: string|null, sponsor_referral_code: string}
     */
    public function resolvePlacementForRegistration(?string $sponsorCode, ?string $requestedSide): array
    {
        $code = $sponsorCode !== null ? strtoupper(trim($sponsorCode)) : '';
        $side = $requestedSide === 'left' || $requestedSide === 'right' ? $requestedSide : null;

        if ($code === '') {
            $defaultUid = strtolower(trim((string) config('registration.default_sponsor_login_uid', 'SEURBRRV')));
            $sponsor = $this->findSponsorByCode($defaultUid);
            if ($sponsor === null) {
                throw ValidationException::withMessages([
                    'sponsor_referral_code' => ['Default sponsor account is not configured. Contact support.'],
                ]);
            }
            $side = (string) config('registration.default_sponsor_binary_side', 'right');
            if ($side !== 'left' && $side !== 'right') {
                $side = 'right';
            }
        } else {
            $sponsor = $this->findSponsorByCode($code);
            if ($sponsor === null) {
                throw ValidationException::withMessages([
                    'sponsor_referral_code' => ['Invalid referral code.'],
                ]);
            }
            if ($side === null) {
                return [
                    'sponsor' => $sponsor,
                    'placement' => null,
                    'binary_side' => null,
                    'sponsor_referral_code' => (string) $sponsor->referral_code,
                ];
            }
        }

        $placement = $this->binaryPlacement->findAvailableSlotInLeg($sponsor, $side);
        if ($placement === null) {
            throw ValidationException::withMessages([
                'binary_side' => ['No placement slot found for this sponsor leg.'],
            ]);
        }

        return [
            'sponsor' => $sponsor,
            'placement' => $placement,
            'binary_side' => $side,
            'sponsor_referral_code' => (string) $sponsor->referral_code,
        ];
    }

    public function attachUserToPlacement(User $user, User $sponsor, array $placement): void
    {
        $user->sponsor_id = $sponsor->id;
        $user->binary_parent_id = $placement['parent']->id;
        $user->binary_side = $placement['side'];
        $user->save();

        /** @var User $parent */
        $parent = $placement['parent'];
        if ($placement['side'] === 'left') {
            $parent->left_child_id = $user->id;
        } else {
            $parent->right_child_id = $user->id;
        }
        $parent->save();
    }
}

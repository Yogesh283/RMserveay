<?php

namespace App\Services;

use App\Models\User;

class WalletBucketService
{
    public function totalAvailable(User $user): string
    {
        return bcadd((string) $user->p2p_wallet_balance, (string) $user->wallet_balance, 2);
    }

    /**
     * Debits P2P bucket first, then main. Mutates the passed user model (already locked).
     *
     * @return array{from_p2p: string, from_main: string}
     */
    public function deductP2pThenMain(User $user, string $amount): array
    {
        if (bccomp($amount, '0.00', 2) <= 0) {
            abort(422, 'Invalid amount.');
        }

        if (bccomp($this->totalAvailable($user), $amount, 2) < 0) {
            abort(422, 'Insufficient wallet balance (main + P2P).');
        }

        $p2p = (string) $user->p2p_wallet_balance;
        $main = (string) $user->wallet_balance;

        $fromP2p = bccomp($p2p, $amount, 2) >= 0 ? $amount : $p2p;
        $needFromMain = bcsub($amount, $fromP2p, 2);
        $fromMain = bccomp($needFromMain, '0.00', 2) > 0 ? $needFromMain : '0.00';

        $user->p2p_wallet_balance = bcsub($p2p, $fromP2p, 2);
        $user->wallet_balance = bcsub($main, $fromMain, 2);

        return [
            'from_p2p' => $fromP2p,
            'from_main' => $fromMain,
        ];
    }

    /** Credits P2P bucket only (e.g. incoming P2P from another user). */
    public function creditP2p(User $user, string $amount): void
    {
        $user->p2p_wallet_balance = bcadd((string) $user->p2p_wallet_balance, $amount, 2);
    }
}

<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Validation\ValidationException;

class WalletBucketService
{
    public function totalAvailable(User $user): string
    {
        return bcadd((string) $user->p2p_wallet_balance, (string) $user->wallet_balance, 2);
    }

    /** Main-wallet funds that may be moved to P2P (excludes self deposits). */
    public function transferableMainToP2p(User $user): string
    {
        $transferable = bcsub((string) $user->wallet_balance, (string) ($user->main_deposit_balance ?? '0.00'), 2);

        return bccomp($transferable, '0', 2) < 0 ? '0.00' : $transferable;
    }

    /** On-chain / gateway deposit — locked from Main→P2P. */
    public function creditMainDeposit(User $user, string $amount): string
    {
        $user->wallet_balance = bcadd((string) $user->wallet_balance, $amount, 2);
        $user->main_deposit_balance = bcadd((string) ($user->main_deposit_balance ?? '0.00'), $amount, 2);

        return (string) $user->wallet_balance;
    }

    /** Programme income, P2P→main returns, signup bonus — transferable to P2P. */
    public function creditMainIncome(User $user, string $amount): string
    {
        $user->wallet_balance = bcadd((string) $user->wallet_balance, $amount, 2);

        return (string) $user->wallet_balance;
    }

    /**
     * Debits P2P bucket first, then main (consumes deposit reserve first on main leg).
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
        $fromP2p = bccomp($p2p, $amount, 2) >= 0 ? $amount : $p2p;
        $needFromMain = bcsub($amount, $fromP2p, 2);
        $fromMain = bccomp($needFromMain, '0.00', 2) > 0 ? $needFromMain : '0.00';

        $user->p2p_wallet_balance = bcsub($p2p, $fromP2p, 2);

        if (bccomp($fromMain, '0', 2) > 0) {
            $this->debitMain($user, $fromMain);
        }

        return [
            'from_p2p' => $fromP2p,
            'from_main' => $fromMain,
        ];
    }

    /** Debit main for fees / withdrawal (deposit bucket consumed first). */
    public function debitMain(User $user, string $amount): void
    {
        if (bccomp($amount, '0.00', 2) <= 0) {
            abort(422, 'Invalid amount.');
        }

        if (bccomp((string) $user->wallet_balance, $amount, 2) < 0) {
            abort(422, 'Insufficient main wallet balance.');
        }

        $deposit = (string) ($user->main_deposit_balance ?? '0.00');
        $fromDeposit = bccomp($amount, $deposit, 2) <= 0 ? $amount : $deposit;

        if (bccomp($fromDeposit, '0', 2) > 0) {
            $user->main_deposit_balance = bcsub($deposit, $fromDeposit, 2);
        }

        $user->wallet_balance = bcsub((string) $user->wallet_balance, $amount, 2);
    }

    /** Main→P2P: only programme income (not deposits). */
    public function transferMainIncomeToP2p(User $user, string $amount): void
    {
        if (bccomp($amount, '0.00', 2) <= 0) {
            abort(422, 'Invalid amount.');
        }

        if (bccomp($this->transferableMainToP2p($user), $amount, 2) < 0) {
            throw ValidationException::withMessages([
                'amount_usd' => ['Only programme income can be moved to P2P. Deposited funds stay in the main wallet for panels and withdrawals.'],
            ]);
        }

        $user->wallet_balance = bcsub((string) $user->wallet_balance, $amount, 2);
    }

    /** Credits P2P bucket only (e.g. incoming P2P from another user). */
    public function creditP2p(User $user, string $amount): void
    {
        $user->p2p_wallet_balance = bcadd((string) $user->p2p_wallet_balance, $amount, 2);
    }

    /**
     * Credits survey income bucket (self / publisher survey payouts).
     *
     * @return string Balance after credit
     */
    public function creditSurvey(User $user, string $amount): string
    {
        $new = bcadd((string) $user->survey_wallet_balance, $amount, 2);
        $user->survey_wallet_balance = $new;

        return $new;
    }

    /** Debit survey income bucket (on-chain withdrawal). */
    public function debitSurvey(User $user, string $amount): string
    {
        if (bccomp($amount, '0.00', 2) <= 0) {
            abort(422, 'Invalid amount.');
        }

        if (bccomp((string) $user->survey_wallet_balance, $amount, 2) < 0) {
            abort(422, 'Insufficient survey wallet balance.');
        }

        $new = bcsub((string) $user->survey_wallet_balance, $amount, 2);
        $user->survey_wallet_balance = $new;

        return $new;
    }
}
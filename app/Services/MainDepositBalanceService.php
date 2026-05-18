<?php

namespace App\Services;

use App\Models\User;
use App\Models\WalletTransaction;

/**
 * Tracks the portion of main wallet that came from deposits (not transferable to P2P).
 */
class MainDepositBalanceService
{
    /**
     * Replay wallet ledger to derive how much of current main balance is deposit-locked.
     */
    public function computeFromLedger(User $user): string
    {
        $deposit = '0.00';
        $main = '0.00';

        $txs = WalletTransaction::query()
            ->where('user_id', $user->id)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['type', 'amount', 'meta']);

        foreach ($txs as $tx) {
            $amount = (string) $tx->amount;
            $meta = is_array($tx->meta) ? $tx->meta : [];

            if ($tx->type === WalletTransaction::TYPE_DEPOSIT_CREDIT && bccomp($amount, '0', 2) > 0) {
                $main = bcadd($main, $amount, 2);
                $deposit = bcadd($deposit, $amount, 2);

                continue;
            }

            if ($this->isMainIncomeCredit($tx->type, $amount)) {
                $main = bcadd($main, $amount, 2);

                continue;
            }

            if ($tx->type === WalletTransaction::TYPE_MAIN_TO_P2P) {
                $gross = $this->absAmount($amount);
                $main = bcsub($main, $gross, 2);

                continue;
            }

            if ($this->isMainDebit($tx->type, $amount)) {
                $gross = $this->absAmount($amount);
                if ($tx->type === WalletTransaction::TYPE_P2P_TRANSFER_OUT) {
                    $fromMain = (string) ($meta['from_main_usd'] ?? '0.00');
                    if (bccomp($fromMain, '0', 2) <= 0) {
                        continue;
                    }
                    $gross = $fromMain;
                }

                $fromDeposit = bccomp($gross, $deposit, 2) <= 0 ? $gross : $deposit;
                if (bccomp($fromDeposit, '0', 2) > 0) {
                    $deposit = bcsub($deposit, $fromDeposit, 2);
                }
                $main = bcsub($main, $gross, 2);

                continue;
            }
        }

        $current = (string) $user->wallet_balance;
        if (bccomp($deposit, $current, 2) > 0) {
            $deposit = $current;
        }
        if (bccomp($deposit, '0', 2) < 0) {
            $deposit = '0.00';
        }

        return $deposit;
    }

    private function isMainIncomeCredit(string $type, string $amount): bool
    {
        if (bccomp($amount, '0', 2) <= 0) {
            return false;
        }

        return in_array($type, [
            WalletTransaction::TYPE_DIRECT_COMMISSION,
            WalletTransaction::TYPE_SURVEY_LEVEL_INCOME,
            WalletTransaction::TYPE_PANEL_MATCHING,
            WalletTransaction::TYPE_ACTIVE_PANEL_MATCHING,
            WalletTransaction::TYPE_SUB_PANEL_MATCHING,
            WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING,
            WalletTransaction::TYPE_P2P_TO_MAIN,
            WalletTransaction::TYPE_SIGNUP_BONUS,
        ], true);
    }

    private function isMainDebit(string $type, string $amount): bool
    {
        if (bccomp($amount, '0', 2) >= 0) {
            return false;
        }

        return in_array($type, [
            WalletTransaction::TYPE_ACTIVATION_FEE,
            WalletTransaction::TYPE_MINIMUM_PANEL_FEE,
            WalletTransaction::TYPE_SUB_PANEL_FEE,
            WalletTransaction::TYPE_SUPER_SUB_PANEL_FEE,
            WalletTransaction::TYPE_WITHDRAWAL,
            WalletTransaction::TYPE_PLAN_PURCHASE,
            WalletTransaction::TYPE_P2P_TRANSFER_OUT,
        ], true);
    }

    private function absAmount(string $signed): string
    {
        $signed = trim($signed);

        return str_starts_with($signed, '-') ? substr($signed, 1) : $signed;
    }
}

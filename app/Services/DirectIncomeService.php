<?php

namespace App\Services;

use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;

class DirectIncomeService
{
    private function rate(): string
    {
        return (string) config('direct_income.rate');
    }

    private function absAmount(string $signed): string
    {
        $signed = trim($signed);
        if (str_starts_with($signed, '-')) {
            return substr($signed, 1);
        }

        return $signed;
    }

    /**
     * 10% of referral's survey wallet credit (same moment as their survey_credit tx).
     */
    public function creditSponsorFromReferralSurvey(User $earner, WalletTransaction $surveyCreditTx, ?string $surveyReference): void
    {
        $this->creditSponsorPercentOfBase(
            downline: $earner,
            baseAmount: (string) $surveyCreditTx->amount,
            duplicatePath: 'trigger_survey_tx_id',
            duplicateValue: $surveyCreditTx->id,
            meta: [
                'source' => 'survey',
                'from_user_id' => $earner->id,
                'survey_credit_tx_id' => $surveyCreditTx->id,
                'survey_reference' => $surveyReference,
                'trigger_survey_tx_id' => $surveyCreditTx->id,
            ]
        );
    }

    /**
     * 10% of referral's fee payment (activation, minimum panel, sub/super panel purchase).
     */
    public function creditSponsorFromReferralFee(User $payer, WalletTransaction $feeDebitTx): void
    {
        $base = $this->absAmount((string) $feeDebitTx->amount);

        $this->creditSponsorPercentOfBase(
            downline: $payer,
            baseAmount: $base,
            duplicatePath: 'trigger_fee_tx_id',
            duplicateValue: $feeDebitTx->id,
            meta: [
                'source' => 'fee',
                'fee_type' => $feeDebitTx->type,
                'from_user_id' => $payer->id,
                'fee_debit_tx_id' => $feeDebitTx->id,
                'trigger_fee_tx_id' => $feeDebitTx->id,
            ]
        );
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function creditSponsorPercentOfBase(
        User $downline,
        string $baseAmount,
        string $duplicatePath,
        int|string $duplicateValue,
        array $meta
    ): void {
        if (bccomp($baseAmount, '0.00', 2) <= 0) {
            return;
        }

        $sponsorId = $downline->sponsor_id;
        if ($sponsorId === null) {
            return;
        }

        $commission = bcmul($baseAmount, $this->rate(), 2);
        if (bccomp($commission, '0.00', 2) <= 0) {
            return;
        }

        DB::transaction(function () use ($sponsorId, $commission, $duplicatePath, $duplicateValue, $meta, $baseAmount) {
            /** @var User|null $sponsor */
            $sponsor = User::whereKey($sponsorId)->lockForUpdate()->first();
            if ($sponsor === null || ! $sponsor->qualifiesForDirectIncome()) {
                return;
            }

            $exists = WalletTransaction::where('user_id', $sponsor->id)
                ->where('type', WalletTransaction::TYPE_DIRECT_COMMISSION)
                ->where("meta->{$duplicatePath}", $duplicateValue)
                ->exists();

            if ($exists) {
                return;
            }

            $newBalance = bcadd((string) $sponsor->wallet_balance, $commission, 2);

            $sponsor->wallet_balance = $newBalance;
            $sponsor->save();

            WalletTransaction::create([
                'user_id' => $sponsor->id,
                'type' => WalletTransaction::TYPE_DIRECT_COMMISSION,
                'amount' => $commission,
                'balance_after' => $newBalance,
                'meta' => array_merge($meta, [
                    'commission_rate' => $this->rate(),
                    'base_amount' => $baseAmount,
                ]),
            ]);
        });
    }
}

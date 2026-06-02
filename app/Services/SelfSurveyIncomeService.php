<?php

namespace App\Services;

use App\Models\SurveyResponse;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;

class SelfSurveyIncomeService
{
    public function __construct(
        protected DirectIncomeService $directIncome,
        protected SurveyLevelIncomeService $surveyLevelIncome,
        protected WalletBucketService $walletBuckets,
    ) {}

    public function perSurveyBreakdown(User $user): array
    {
        $c = config('self_survey');

        $panelist = (string) $c['panelist_per_survey'];
        $active = $user->qualifiesActivePanelistIncome() ? (string) $c['active_panelist_per_survey'] : '0.00';
        $subN = min((int) $user->sub_panel_count, (int) $c['max_sub_panels']);
        $superN = min((int) $user->super_sub_panel_count, (int) $c['max_super_sub_panels']);

        $subTotal = bcmul((string) $c['sub_panel_per_survey_each'], (string) $subN, 2);
        $superTotal = bcmul((string) $c['super_sub_panel_per_survey_each'], (string) $superN, 2);

        $total = '0.00';
        $total = bcadd($total, $panelist, 2);
        $total = bcadd($total, $active, 2);
        $total = bcadd($total, $subTotal, 2);
        $total = bcadd($total, $superTotal, 2);

        return [
            'panelist' => $panelist,
            'active_panelist' => $active,
            'sub_panels' => $subTotal,
            'super_sub_panels' => $superTotal,
            'total' => $total,
        ];
    }

    public function debitFee(User $user, string $amount, string $type, array $meta = []): WalletTransaction
    {
        return DB::transaction(function () use ($user, $amount, $type, $meta) {
            /** @var User $locked */
            $locked = User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            $sources = $this->walletBuckets->deductP2pThenMain($locked, $amount);
            $locked->save();

            $feeTx = WalletTransaction::create([
                'user_id' => $locked->id,
                'type' => $type,
                'amount' => '-'.$amount,
                'balance_after' => (string) $locked->wallet_balance,
                'meta' => array_merge($meta, [
                    'from_p2p_usd' => $sources['from_p2p'],
                    'from_main_usd' => $sources['from_main'],
                    'p2p_balance_after' => (string) $locked->p2p_wallet_balance,
                ]),
            ]);

            $this->directIncome->creditSponsorFromReferralFee($locked, $feeTx);

            return $feeTx;
        });
    }

    public function creditSurvey(User $user, ?string $reference = null): WalletTransaction
    {
        return DB::transaction(function () use ($user, $reference) {
            /** @var User $locked */
            $locked = User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            if (! $locked->receivesSurveyIncomeToWallet()) {
                abort(422, 'Survey income wallet credit is disabled for this account.');
            }

            $breakdown = $this->perSurveyBreakdown($locked);
            $amount = $breakdown['total'];

            if (bccomp($amount, '0.00', 2) <= 0) {
                abort(422, 'No self survey income configured for this account.');
            }

            if ($reference !== null && $reference !== '') {
                $exists = WalletTransaction::where('user_id', $locked->id)
                    ->where('type', WalletTransaction::TYPE_SURVEY_CREDIT)
                    ->where('meta->reference', $reference)
                    ->exists();

                if ($exists) {
                    abort(422, 'Duplicate survey reference.');
                }
            }

            $newBalance = $this->walletBuckets->creditSurvey($locked, $amount);
            $locked->save();

            $meta = [
                'breakdown' => $breakdown,
                'bucket' => 'survey',
                'survey_balance_after' => $newBalance,
            ];
            if ($reference !== null && $reference !== '') {
                $meta['reference'] = $reference;
            }

            $surveyTx = WalletTransaction::create([
                'user_id' => $locked->id,
                'type' => WalletTransaction::TYPE_SURVEY_CREDIT,
                'amount' => $amount,
                'balance_after' => $newBalance,
                'meta' => $meta,
            ]);

            $this->directIncome->creditSponsorFromReferralSurvey($locked, $surveyTx, $reference);

            $this->surveyLevelIncome->distributeFromSurveyCredit($locked, $surveyTx);

            return $surveyTx;
        });
    }

    /**
     * Credit member wallet for a completed publisher survey after the delay (scheduled job).
     * Idempotent via meta.survey_response_id.
     */
    public function creditPublisherSurveyResponsePayout(SurveyResponse $response): ?WalletTransaction
    {
        if (! $response->respondent_user_id || ! $response->completed) {
            return null;
        }

        if ($response->respondent_payout_wallet_tx_id) {
            return null;
        }

        $amount = (string) ($response->respondent_reward_usd ?? '0.00');
        if (bccomp($amount, '0.00', 2) <= 0) {
            return null;
        }

        return DB::transaction(function () use ($response, $amount) {
            /** @var User $locked */
            $locked = User::whereKey($response->respondent_user_id)->lockForUpdate()->firstOrFail();

            if (! $locked->receivesSurveyIncomeToWallet()) {
                if ($response->respondent_payout_suppressed_at === null) {
                    $response->respondent_payout_suppressed_at = now();
                    $response->save();
                }

                return null;
            }

            $existing = WalletTransaction::query()
                ->where('user_id', $locked->id)
                ->where('type', WalletTransaction::TYPE_SURVEY_CREDIT)
                ->where('meta->survey_response_id', $response->id)
                ->first();

            if ($existing !== null) {
                if (! $response->respondent_payout_wallet_tx_id) {
                    $response->respondent_payout_wallet_tx_id = $existing->id;
                    $response->save();
                }

                return $existing;
            }

            $ref = 'survey_response:'.$response->id;
            $newBalance = $this->walletBuckets->creditSurvey($locked, $amount);
            $locked->save();

            $surveyTx = WalletTransaction::create([
                'user_id' => $locked->id,
                'type' => WalletTransaction::TYPE_SURVEY_CREDIT,
                'amount' => $amount,
                'balance_after' => $newBalance,
                'meta' => [
                    'survey_response_id' => $response->id,
                    'survey_id' => $response->survey_id,
                    'payout' => 'delayed',
                    'reference' => $ref,
                    'bucket' => 'survey',
                    'survey_balance_after' => $newBalance,
                ],
            ]);

            $this->directIncome->creditSponsorFromReferralSurvey($locked, $surveyTx, $ref);
            $this->surveyLevelIncome->distributeFromSurveyCredit($locked, $surveyTx);

            $response->respondent_payout_wallet_tx_id = $surveyTx->id;
            $response->save();

            return $surveyTx;
        });
    }
}

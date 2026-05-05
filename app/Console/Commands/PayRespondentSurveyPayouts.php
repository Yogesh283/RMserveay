<?php

namespace App\Console\Commands;

use App\Models\SurveyResponse;
use App\Services\SelfSurveyIncomeService;
use Illuminate\Console\Command;

class PayRespondentSurveyPayouts extends Command
{
    protected $signature = 'surveys:pay-respondent-payouts';

    protected $description = 'Credit respondent wallets for survey completions whose delay window has passed';

    public function handle(SelfSurveyIncomeService $selfSurveyIncome): int
    {
        $paid = 0;

        $q = SurveyResponse::query()
            ->where('completed', true)
            ->whereNotNull('respondent_user_id')
            ->whereNotNull('respondent_payout_at')
            ->whereNull('respondent_payout_wallet_tx_id')
            ->where('respondent_payout_at', '<=', now())
            ->orderBy('id');

        foreach ($q->cursor() as $response) {
            $tx = $selfSurveyIncome->creditPublisherSurveyResponsePayout($response);
            if ($tx !== null) {
                $paid++;
            }
        }

        if ($paid > 0) {
            $this->info("Paid {$paid} respondent survey reward(s).");
        }

        return self::SUCCESS;
    }
}

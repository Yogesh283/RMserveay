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
        $dueQuery = SurveyResponse::query()
            ->where('completed', true)
            ->whereNotNull('respondent_user_id')
            ->whereNotNull('respondent_payout_at')
            ->whereNull('respondent_payout_wallet_tx_id')
            ->where('respondent_payout_at', '<=', now());

        $dueCount = (clone $dueQuery)->count();
        $this->line("Due now (7-day window passed): {$dueCount}");

        $waiting = SurveyResponse::query()
            ->where('completed', true)
            ->whereNotNull('respondent_user_id')
            ->whereNotNull('respondent_payout_at')
            ->whereNull('respondent_payout_wallet_tx_id')
            ->where('respondent_payout_at', '>', now())
            ->count();
        if ($waiting > 0) {
            $this->line("Still waiting for payout date: {$waiting}");
        }

        $paid = 0;
        foreach ($dueQuery->orderBy('id')->cursor() as $response) {
            $tx = $selfSurveyIncome->creditPublisherSurveyResponsePayout($response);
            if ($tx !== null) {
                $paid++;
            }
        }

        if ($paid > 0) {
            $this->info("Credited {$paid} respondent survey reward(s) to member wallets.");
        } elseif ($dueCount === 0) {
            $this->comment('No survey payouts due right now.');
        } else {
            $this->warn("{$dueCount} response(s) were due but none were credited (check logs / duplicate refs).");
        }

        return self::SUCCESS;
    }
}

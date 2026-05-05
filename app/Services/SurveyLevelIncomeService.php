<?php

namespace App\Services;

use App\Models\User;
use App\Models\WalletTransaction;

class SurveyLevelIncomeService
{
    /**
     * Pays each sponsor up the chain 1% of this survey credit (same base), max 10 levels.
     * Called inside the same DB transaction as the survey credit.
     */
    public function distributeFromSurveyCredit(User $earner, WalletTransaction $surveyTx): void
    {
        $base = (string) $surveyTx->amount;
        if (bccomp($base, '0.00', 2) <= 0) {
            return;
        }

        $rate = (string) config('level_income.rate_per_level');
        $commission = bcmul($base, $rate, 2);
        if (bccomp($commission, '0.00', 2) <= 0) {
            return;
        }

        $maxLevels = (int) config('level_income.max_levels');
        $ancestorId = $earner->sponsor_id;
        $visited = [];

        for ($level = 1; $level <= $maxLevels && $ancestorId !== null; $level++) {
            if (isset($visited[$ancestorId])) {
                break;
            }
            $visited[$ancestorId] = true;

            $duplicate = WalletTransaction::where('user_id', $ancestorId)
                ->where('type', WalletTransaction::TYPE_SURVEY_LEVEL_INCOME)
                ->where('meta->trigger_survey_tx_id', $surveyTx->id)
                ->where('meta->level', $level)
                ->exists();

            if ($duplicate) {
                $ancestorId = User::whereKey($ancestorId)->value('sponsor_id');

                continue;
            }

            /** @var User|null $ancestor */
            $ancestor = User::whereKey($ancestorId)->lockForUpdate()->first();
            if ($ancestor === null) {
                break;
            }

            if ($ancestor->qualifiesActivePanelistIncome()) {
                $newBalance = bcadd((string) $ancestor->wallet_balance, $commission, 2);
                $ancestor->wallet_balance = $newBalance;
                $ancestor->save();

                WalletTransaction::create([
                    'user_id' => $ancestor->id,
                    'type' => WalletTransaction::TYPE_SURVEY_LEVEL_INCOME,
                    'amount' => $commission,
                    'balance_after' => $newBalance,
                    'meta' => [
                        'level' => $level,
                        'from_user_id' => $earner->id,
                        'base_survey_usd' => $base,
                        'rate' => $rate,
                        'trigger_survey_tx_id' => $surveyTx->id,
                    ],
                ]);
            }

            $ancestorId = $ancestor->sponsor_id;
        }
    }

    public function earnedToday(User $user): string
    {
        $sum = WalletTransaction::query()
            ->where('user_id', $user->id)
            ->where('type', WalletTransaction::TYPE_SURVEY_LEVEL_INCOME)
            ->whereDate('created_at', now()->toDateString())
            ->sum('amount');

        return number_format((float) ($sum ?? 0), 2, '.', '');
    }

    /**
     * @return array<int, string> level 1..10 => amount string
     */
    public function earnedTodayByLevel(User $user): array
    {
        $max = (int) config('level_income.max_levels');
        $byLevel = [];
        for ($i = 1; $i <= $max; $i++) {
            $byLevel[$i] = '0.00';
        }

        $rows = WalletTransaction::query()
            ->where('user_id', $user->id)
            ->where('type', WalletTransaction::TYPE_SURVEY_LEVEL_INCOME)
            ->whereDate('created_at', now()->toDateString())
            ->get();

        foreach ($rows as $t) {
            $lvl = (int) ($t->meta['level'] ?? 0);
            if ($lvl >= 1 && $lvl <= $max) {
                $byLevel[$lvl] = bcadd($byLevel[$lvl], (string) $t->amount, 2);
            }
        }

        return $byLevel;
    }

    public function status(User $user): array
    {
        $max = (int) config('level_income.max_levels');
        $rate = (string) config('level_income.rate_per_level');
        $byLevel = $this->earnedTodayByLevel($user);
        $tiers = [];
        for ($i = 1; $i <= $max; $i++) {
            $tiers[] = [
                'level' => $i,
                'percent' => bcmul($rate, '100', 2),
                'earned_today_usd' => $byLevel[$i],
            ];
        }

        return [
            'eligible' => $user->qualifiesActivePanelistIncome(),
            'eligible_hint' => 'Active panelist required to receive level payouts ($1 activation + $10 minimum panel fee paid).',
            'total_levels' => $max,
            'rate_per_level' => $rate,
            'rate_percent_per_level' => bcmul($rate, '100', 2),
            'earned_today_usd' => $this->earnedToday($user),
            'levels' => $tiers,
        ];
    }
}

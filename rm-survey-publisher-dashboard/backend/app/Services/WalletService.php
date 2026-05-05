<?php

namespace App\Services;

use App\Models\Earning;
use App\Models\PublisherNotification;
use App\Models\PublisherTransaction;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;

class WalletService
{
    public function creditSurveyResponse(User $publisher, Survey $survey, SurveyResponse $response, float $amountUsd): void
    {
        DB::transaction(function () use ($publisher, $survey, $response, $amountUsd) {
            /** @var Wallet $wallet */
            $wallet = Wallet::query()->where('user_id', $publisher->id)->lockForUpdate()->firstOrFail();
            $wallet->increment('balance', $amountUsd);

            Earning::query()->create([
                'user_id' => $publisher->id,
                'survey_id' => $survey->id,
                'survey_response_id' => $response->id,
                'amount' => $amountUsd,
                'description' => 'Survey response reward',
            ]);

            PublisherTransaction::query()->create([
                'user_id' => $publisher->id,
                'wallet_id' => $wallet->id,
                'type' => 'credit_earning',
                'amount' => $amountUsd,
                'status' => 'completed',
                'description' => 'Credit: '.$survey->title,
                'meta' => ['survey_id' => $survey->id, 'survey_response_id' => $response->id],
            ]);

            $survey->increment('response_count');
            $survey->increment('earnings_total', $amountUsd);

            PublisherNotification::query()->create([
                'user_id' => $publisher->id,
                'title' => 'New survey response',
                'body' => 'Your survey "'.$survey->title.'" received a new response.',
                'type' => 'survey_completed',
                'meta' => ['survey_id' => $survey->id],
            ]);

            PublisherNotification::query()->create([
                'user_id' => $publisher->id,
                'title' => 'Earnings update',
                'body' => sprintf('+$%s credited to your wallet.', number_format($amountUsd, 2)),
                'type' => 'earning',
                'meta' => ['survey_id' => $survey->id],
            ]);
        });
    }

    /**
     * @return array{transaction: PublisherTransaction, wallet: Wallet}
     */
    public function requestWithdrawal(User $publisher, float $amountUsd, ?string $description = null): array
    {
        return DB::transaction(function () use ($publisher, $amountUsd, $description) {
            /** @var Wallet $wallet */
            $wallet = Wallet::query()->where('user_id', $publisher->id)->lockForUpdate()->firstOrFail();

            if ((float) $wallet->balance < $amountUsd) {
                abort(422, 'Insufficient wallet balance');
            }

            $wallet->decrement('balance', $amountUsd);

            $tx = PublisherTransaction::query()->create([
                'user_id' => $publisher->id,
                'wallet_id' => $wallet->id,
                'type' => 'withdrawal',
                'amount' => $amountUsd,
                'status' => 'pending',
                'description' => $description ?: 'Withdrawal request',
                'meta' => [],
            ]);

            PublisherNotification::query()->create([
                'user_id' => $publisher->id,
                'title' => 'Withdrawal requested',
                'body' => sprintf('$%s withdrawal is pending review.', number_format($amountUsd, 2)),
                'type' => 'withdrawal',
                'meta' => ['transaction_id' => $tx->id],
            ]);

            return ['transaction' => $tx->fresh(), 'wallet' => $wallet->fresh()];
        });
    }
}

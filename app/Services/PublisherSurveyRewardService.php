<?php

namespace App\Services;

use App\Models\Earning;
use App\Models\PublisherNotification;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class PublisherSurveyRewardService
{
    public function creditCompletedResponse(User $publisher, Survey $survey, SurveyResponse $response, string $amount): void
    {
        if (bccomp($amount, '0.00', 2) <= 0) {
            return;
        }

        DB::transaction(function () use ($publisher, $survey, $response, $amount) {
            Earning::query()->create([
                'user_id' => $publisher->id,
                'survey_id' => $survey->id,
                'survey_response_id' => $response->id,
                'amount' => $amount,
                'description' => 'Survey response: '.$survey->title,
            ]);

            $survey->increment('earnings_total', $amount);

            PublisherNotification::query()->create([
                'user_id' => $publisher->id,
                'title' => 'New survey response',
                'body' => 'Your survey "'.$survey->title.'" received a completed response.',
                'type' => 'survey_response',
                'meta' => ['survey_id' => $survey->id, 'survey_response_id' => $response->id],
            ]);

            PublisherNotification::query()->create([
                'user_id' => $publisher->id,
                'title' => 'Earnings update',
                'body' => sprintf('+%s credited for survey responses.', number_format((float) $amount, 2)),
                'type' => 'earning',
                'meta' => ['survey_id' => $survey->id],
            ]);
        });
    }
}

<?php

namespace App\Support;

use App\Models\Survey;
use App\Models\SurveyQuestion;

class SurveyFormatter
{
    public static function questionToArray(SurveyQuestion $q): array
    {
        return [
            'key' => $q->question_key,
            'type' => $q->type,
            'label' => $q->label,
            'description' => $q->description,
            'required' => $q->required,
            'options' => $q->options ?? [],
            'minRating' => $q->min_rating,
            'maxRating' => $q->max_rating,
            'order' => $q->sort_order,
            'logic' => $q->logic,
        ];
    }

    public static function surveyToArray(Survey $survey, bool $withQuestions = true): array
    {
        $data = [
            '_id' => (string) $survey->id,
            'id' => $survey->id,
            'title' => $survey->title,
            'description' => $survey->description,
            'status' => $survey->status,
            'memberTier' => $survey->member_tier ?? Survey::TIER_FREE,
            'responseCount' => $survey->response_count,
            'earningsTotalUsd' => (float) $survey->earnings_total,
            'targetAudience' => $survey->target_audience,
            'createdAt' => $survey->created_at?->toIso8601String(),
            'updatedAt' => $survey->updated_at?->toIso8601String(),
        ];

        if ($withQuestions) {
            $survey->loadMissing('questions');
            $data['questions'] = $survey->questions->map(fn ($q) => self::questionToArray($q))->values()->all();
        }

        return $data;
    }
}

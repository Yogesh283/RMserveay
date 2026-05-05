<?php

namespace App\Http\Controllers\Publisher;

use App\Http\Controllers\Controller;
use App\Models\Survey;
use App\Models\SurveyResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublisherAnalyticsController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $publisherId = $request->user()->id;

        $totalResponses = SurveyResponse::query()->where('user_id', $publisherId)->count();
        $completed = SurveyResponse::query()->where('user_id', $publisherId)->where('completed', true)->count();
        $dropped = SurveyResponse::query()->where('user_id', $publisherId)->where('completed', false)->count();

        $completionRate = $totalResponses > 0 ? (int) round(($completed / $totalResponses) * 100) : 0;

        $avgSec = SurveyResponse::query()
            ->where('user_id', $publisherId)
            ->whereNotNull('completion_time_sec')
            ->where('completion_time_sec', '>', 0)
            ->avg('completion_time_sec');
        $medianSeconds = $avgSec !== null ? (int) round((float) $avgSec) : null;

        $dropOffs = SurveyResponse::query()
            ->where('user_id', $publisherId)
            ->whereNotNull('drop_off_question_key')
            ->selectRaw('drop_off_question_key as qk, COUNT(*) as c')
            ->groupBy('qk')
            ->orderByDesc('c')
            ->limit(10)
            ->get();

        $surveys = Survey::query()
            ->where('user_id', $publisherId)
            ->select(['title', 'response_count'])
            ->get();

        return response()->json([
            'completionRate' => $completionRate,
            'totalResponses' => $totalResponses,
            'completed' => $completed,
            'dropped' => $dropped,
            'medianTimeSec' => $medianSeconds ?: null,
            'dropOffByQuestion' => $dropOffs->map(fn ($r) => ['questionKey' => $r->qk, 'count' => (int) $r->c])->values(),
            'surveys' => $surveys,
        ]);
    }
}

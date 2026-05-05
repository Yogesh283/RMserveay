<?php

namespace App\Http\Controllers\Publisher;

use App\Http\Controllers\Controller;
use App\Models\Earning;
use App\Models\Survey;
use App\Models\SurveyResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublisherDashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $publisherId = $request->user()->id;

        $totalSurveys = Survey::query()->where('user_id', $publisherId)->count();
        $activeSurveys = Survey::query()->where('user_id', $publisherId)->where('status', 'active')->count();
        $totalResponses = SurveyResponse::query()->where('user_id', $publisherId)->count();
        $totalEarnings = (float) Earning::query()->where('user_id', $publisherId)->sum('amount');

        $surveysThisMonth = Survey::query()
            ->where('user_id', $publisherId)
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();

        return response()->json([
            'stats' => [
                'totalSurveys' => $totalSurveys,
                'activeSurveys' => $activeSurveys,
                'totalResponses' => $totalResponses,
                'totalEarnings' => $totalEarnings,
                'surveysThisMonth' => $surveysThisMonth,
            ],
        ]);
    }

    public function performance(Request $request): JsonResponse
    {
        $publisherId = $request->user()->id;
        $start = now()->subDays(14)->startOfDay();

        $rows = SurveyResponse::query()
            ->where('user_id', $publisherId)
            ->where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->orderBy('d')
            ->get();

        return response()->json([
            'series' => $rows->map(fn ($r) => ['date' => $r->d, 'responses' => (int) $r->c])->values(),
        ]);
    }

    public function responsesBySurvey(Request $request): JsonResponse
    {
        $publisherId = $request->user()->id;

        $items = Survey::query()
            ->where('user_id', $publisherId)
            ->select(['id', 'title', 'response_count', 'earnings_total', 'status'])
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->title,
                'status' => $s->status,
                'responses' => (int) $s->response_count,
                'earnings' => (float) $s->earnings_total,
            ]);

        return response()->json(['items' => $items]);
    }

    public function completionSplit(Request $request): JsonResponse
    {
        $publisherId = $request->user()->id;

        $completed = SurveyResponse::query()->where('user_id', $publisherId)->where('completed', true)->count();
        $dropped = SurveyResponse::query()->where('user_id', $publisherId)->where('completed', false)->count();

        return response()->json([
            'completed' => $completed,
            'dropped' => $dropped,
        ]);
    }

    public function recentActivity(Request $request): JsonResponse
    {
        $publisherId = $request->user()->id;

        $recent = SurveyResponse::query()
            ->with('survey:id,title')
            ->where('user_id', $publisherId)
            ->orderByDesc('created_at')
            ->limit(12)
            ->get();

        $activity = $recent->map(fn ($r) => [
            'id' => (string) $r->id,
            'time' => $r->created_at->toIso8601String(),
            'text' => $r->survey ? 'Response on "'.$r->survey->title.'"' : 'New response',
            'type' => $r->completed ? 'ok' : 'info',
        ]);

        return response()->json(['activity' => $activity]);
    }
}

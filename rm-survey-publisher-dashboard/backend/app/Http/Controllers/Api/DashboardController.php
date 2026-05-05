<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Survey;
use App\Models\SurveyResponse;
use Illuminate\Http\Request;
class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $publisherId = $request->user()->id;

        $wallet = $request->user()->wallet;

        $totalSurveys = Survey::query()->where('user_id', $publisherId)->count();
        $activeSurveys = Survey::query()->where('user_id', $publisherId)->where('status', 'active')->count();
        $totalResponses = SurveyResponse::query()->where('user_id', $publisherId)->count();

        return response()->json([
            'totalSurveys' => $totalSurveys,
            'activeSurveys' => $activeSurveys,
            'totalResponses' => $totalResponses,
            'totalEarningsUsd' => $wallet ? (float) $wallet->balance : 0.0,
        ]);
    }

    public function performance(Request $request)
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

    public function responsesBySurvey(Request $request)
    {
        $publisherId = $request->user()->id;

        $items = Survey::query()
            ->where('user_id', $publisherId)
            ->select(['id', 'title', 'response_count', 'earnings_total'])
            ->get()
            ->map(fn ($s) => [
                'name' => $s->title,
                'responses' => $s->response_count,
                'earnings' => (float) $s->earnings_total,
            ]);

        return response()->json(['items' => $items]);
    }

    public function completionSplit(Request $request)
    {
        $publisherId = $request->user()->id;

        $completed = SurveyResponse::query()->where('user_id', $publisherId)->where('completed', true)->count();
        $dropped = SurveyResponse::query()->where('user_id', $publisherId)->where('completed', false)->count();

        return response()->json([
            'segments' => [
                ['name' => 'Completed', 'value' => $completed, 'color' => '#42B72A'],
                ['name' => 'Drop-off', 'value' => $dropped, 'color' => '#FA383E'],
            ],
        ]);
    }

    public function recentActivity(Request $request)
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
            'type' => $r->completed ? 'ok' : 'alert',
        ]);

        return response()->json(['activity' => $activity]);
    }
}

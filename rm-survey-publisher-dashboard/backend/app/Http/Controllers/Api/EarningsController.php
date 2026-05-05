<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Earning;
use Illuminate\Http\Request;

class EarningsController extends Controller
{
    public function summary(Request $request)
    {
        $wallet = $request->user()->wallet;

        return response()->json([
            'balanceUsd' => $wallet ? (float) $wallet->balance : 0.0,
        ]);
    }

    public function chart(Request $request)
    {
        $range = $request->query('range', '30d');
        $days = match ($range) {
            '7d' => 7,
            '90d' => 90,
            default => 30,
        };

        $publisherId = $request->user()->id;
        $start = now()->subDays($days)->startOfDay();

        $rows = Earning::query()
            ->where('user_id', $publisherId)
            ->where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as d, SUM(amount) as total')
            ->groupBy('d')
            ->orderBy('d')
            ->get();

        return response()->json([
            'series' => $rows->map(fn ($r) => ['date' => $r->d, 'amount' => (float) $r->total])->values(),
        ]);
    }

    public function list(Request $request)
    {
        $publisherId = $request->user()->id;

        $items = Earning::query()
            ->with('survey:id,title')
            ->where('user_id', $publisherId)
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'amountUsd' => (float) $e->amount,
                'description' => $e->description,
                'surveyTitle' => $e->survey?->title,
                'createdAt' => $e->created_at->toIso8601String(),
            ]);

        return response()->json(['earnings' => $items]);
    }
}

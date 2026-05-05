<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SurveyResponse;
use Illuminate\Http\Request;

class AudienceController extends Controller
{
    public function users(Request $request)
    {
        $publisherId = $request->user()->id;

        $q = SurveyResponse::query()
            ->with('survey:id,title')
            ->where('user_id', $publisherId);

        if ($request->filled('gender')) {
            $q->where('respondent->gender', $request->string('gender'));
        }

        if ($request->filled('location')) {
            $q->where('respondent->location', 'like', '%'.$request->string('location').'%');
        }

        if ($request->filled('ageMin')) {
            $q->where('respondent->age', '>=', (int) $request->query('ageMin'));
        }

        if ($request->filled('ageMax')) {
            $q->where('respondent->age', '<=', (int) $request->query('ageMax'));
        }

        $responses = $q->orderByDesc('created_at')->limit(500)->get();

        $users = $responses->map(fn ($r) => [
            'id' => (string) $r->id,
            'survey' => $r->survey?->title ?? '—',
            'age' => $r->respondent['age'] ?? null,
            'gender' => $r->respondent['gender'] ?? '—',
            'location' => $r->respondent['location'] ?? '—',
            'engaged' => $r->completed,
            'submittedAt' => $r->created_at->toIso8601String(),
        ]);

        $engaged = $users->filter(fn ($u) => $u['engaged'])->count();
        $total = $users->count();

        return response()->json([
            'users' => $users->values(),
            'metrics' => [
                'total' => $total,
                'engaged' => $engaged,
                'engagementRate' => $total > 0 ? (int) round(($engaged / $total) * 100) : 0,
            ],
        ]);
    }
}

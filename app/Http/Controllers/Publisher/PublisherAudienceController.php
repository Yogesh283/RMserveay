<?php

namespace App\Http\Controllers\Publisher;

use App\Http\Controllers\Controller;
use App\Models\SurveyResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublisherAudienceController extends Controller
{
    public function index(Request $request): JsonResponse
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
            'name' => $this->respondentLabel($r->respondent),
            'survey' => $r->survey?->title ?? '—',
            'location' => $r->respondent['location'] ?? '—',
            'surveysCount' => null,
            'engagementPct' => $r->completed ? 100 : 45,
            'age' => $r->respondent['age'] ?? null,
            'gender' => $r->respondent['gender'] ?? '—',
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

    /**
     * @param  array<string, mixed>|null  $respondent
     */
    private function respondentLabel(?array $respondent): string
    {
        if (! $respondent) {
            return 'Respondent';
        }
        if (! empty($respondent['name'])) {
            return (string) $respondent['name'];
        }

        $parts = array_filter([
            $respondent['gender'] ?? null,
            isset($respondent['age']) ? (string) $respondent['age'] : null,
        ]);

        return $parts !== [] ? implode(' · ', $parts) : 'Respondent';
    }
}

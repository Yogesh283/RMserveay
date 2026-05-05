<?php

namespace App\Http\Controllers\Publisher;

use App\Http\Controllers\Controller;
use App\Models\Survey;
use App\Models\SurveyQuestion;
use App\Models\SurveyResponse;
use App\Services\PublisherSurveyRewardService;
use App\Support\SurveyFormatter;
use App\Support\SurveyQuestionValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PublisherSurveyController extends Controller
{
    public function __construct(
        private PublisherSurveyRewardService $rewardService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $q = Survey::query()->where('user_id', $user->id);

        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('from')) {
            $q->where('updated_at', '>=', $request->date('from')->startOfDay());
        }
        if ($request->filled('to')) {
            $q->where('updated_at', '<=', $request->date('to')->endOfDay());
        }

        $surveys = $q->orderByDesc('updated_at')->get()->map(fn ($s) => SurveyFormatter::surveyToArray($s, false));

        return response()->json(['surveys' => $surveys]);
    }

    public function show(Request $request, Survey $survey): JsonResponse
    {
        $this->authorizePublisher($request, $survey);
        $survey->load('questions');

        return response()->json(['survey' => SurveyFormatter::surveyToArray($survey, true)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:draft,active,inactive',
            'member_tier' => 'nullable|in:free,panel,sub_panel,super_panel',
            'memberTier' => 'nullable|in:free,panel,sub_panel,super_panel',
            'target_audience' => 'nullable|array',
            'targetAudience' => 'nullable|array',
            'questions' => 'required|array|min:1',
        ]);

        SurveyQuestionValidator::assertValid($data['questions']);

        $audience = $data['target_audience'] ?? $data['targetAudience'] ?? null;
        $memberTier = $data['member_tier'] ?? $data['memberTier'] ?? Survey::TIER_FREE;

        $survey = DB::transaction(function () use ($request, $data, $audience, $memberTier) {
            $survey = Survey::query()->create([
                'user_id' => $request->user()->id,
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'status' => $data['status'] ?? 'draft',
                'member_tier' => $memberTier,
                'target_audience' => $audience,
            ]);

            $this->persistQuestions($survey, $data['questions']);

            return $survey->load('questions');
        });

        return response()->json(['survey' => SurveyFormatter::surveyToArray($survey, true)], 201);
    }

    public function update(Request $request, Survey $survey): JsonResponse
    {
        $this->authorizePublisher($request, $survey);

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:draft,active,inactive',
            'member_tier' => 'sometimes|in:free,panel,sub_panel,super_panel',
            'memberTier' => 'sometimes|in:free,panel,sub_panel,super_panel',
            'target_audience' => 'nullable|array',
            'targetAudience' => 'nullable|array',
            'questions' => 'sometimes|array|min:1',
        ]);

        if (isset($data['questions'])) {
            SurveyQuestionValidator::assertValid($data['questions']);
        }

        DB::transaction(function () use ($survey, $data) {
            if (isset($data['title'])) {
                $survey->title = $data['title'];
            }
            if (array_key_exists('description', $data)) {
                $survey->description = $data['description'];
            }
            if (isset($data['status'])) {
                $survey->status = $data['status'];
            }
            if (array_key_exists('member_tier', $data) || array_key_exists('memberTier', $data)) {
                $survey->member_tier = $data['member_tier'] ?? $data['memberTier'] ?? Survey::TIER_FREE;
            }
            if (array_key_exists('target_audience', $data) || array_key_exists('targetAudience', $data)) {
                $survey->target_audience = $data['target_audience'] ?? $data['targetAudience'] ?? null;
            }
            $survey->save();

            if (isset($data['questions'])) {
                $survey->questions()->delete();
                $this->persistQuestions($survey->fresh(), $data['questions']);
            }
        });

        $survey->refresh()->load('questions');

        return response()->json(['survey' => SurveyFormatter::surveyToArray($survey, true)]);
    }

    public function updateStatus(Request $request, Survey $survey): JsonResponse
    {
        $this->authorizePublisher($request, $survey);

        $data = $request->validate([
            'status' => 'required|in:draft,active,inactive',
        ]);

        $survey->update(['status' => $data['status']]);

        return response()->json(['survey' => SurveyFormatter::surveyToArray($survey->fresh()->load('questions'), true)]);
    }

    public function destroy(Request $request, Survey $survey): JsonResponse
    {
        $this->authorizePublisher($request, $survey);
        $survey->delete();

        return response()->json(['ok' => true]);
    }

    public function publicShow(int $id): JsonResponse
    {
        $survey = Survey::query()->with('questions')->whereKey($id)->firstOrFail();

        if ($survey->status !== 'active') {
            abort(404, 'Survey not found');
        }

        return response()->json(['survey' => SurveyFormatter::surveyToArray($survey, true)]);
    }

    public function submitResponse(Request $request, int $id): JsonResponse
    {
        $survey = Survey::query()->with('questions')->whereKey($id)->firstOrFail();

        if ($survey->status !== 'active') {
            abort(422, 'Survey is not accepting responses');
        }

        $data = $request->validate([
            'answers' => 'required|array',
            'answers.*.questionKey' => 'required|string',
            'answers.*.value' => 'nullable',
            'respondent' => 'nullable|array',
            'respondent.age' => 'nullable|integer',
            'respondent.gender' => 'nullable|string|max:64',
            'respondent.location' => 'nullable|string|max:255',
            'completionTimeSec' => 'nullable|integer',
            'dropOffAtQuestionKey' => 'nullable|string',
        ]);

        $keys = $survey->questions->pluck('question_key')->flip()->all();
        foreach ($data['answers'] as $row) {
            $qk = $row['questionKey'];
            if (! isset($keys[$qk])) {
                abort(422, 'Unknown question key: '.$qk);
            }
        }

        $completed = empty($data['dropOffAtQuestionKey']);

        $response = SurveyResponse::query()->create([
            'survey_id' => $survey->id,
            'user_id' => $survey->user_id,
            'respondent_user_id' => null,
            'answers' => $data['answers'],
            'respondent' => $data['respondent'] ?? [],
            'completed' => $completed,
            'drop_off_question_key' => $data['dropOffAtQuestionKey'] ?? null,
            'completion_time_sec' => $data['completionTimeSec'] ?? null,
        ]);

        $survey->increment('response_count');

        $rate = (string) config('publisher.earning_per_response', '0');

        if ($completed && bccomp($rate, '0.00', 2) > 0) {
            $publisher = $survey->publisher()->firstOrFail();
            $this->rewardService->creditCompletedResponse($publisher, $survey->fresh(), $response, $rate);
        }

        return response()->json([
            'response' => ['id' => $response->id],
            'earningAmount' => $completed ? (float) $rate : 0.0,
        ], 201);
    }

    public function listResponses(Request $request, Survey $survey): JsonResponse
    {
        $this->authorizePublisher($request, $survey);

        $rows = SurveyResponse::query()
            ->where('survey_id', $survey->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['responses' => $rows]);
    }

    private function authorizePublisher(Request $request, Survey $survey): void
    {
        if ((int) $survey->user_id !== (int) $request->user()->id) {
            abort(404);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $questions
     */
    private function persistQuestions(Survey $survey, array $questions): void
    {
        foreach ($questions as $i => $q) {
            SurveyQuestion::query()->create([
                'survey_id' => $survey->id,
                'question_key' => $q['key'],
                'type' => $q['type'],
                'label' => $q['label'],
                'description' => $q['description'] ?? null,
                'required' => (bool) ($q['required'] ?? false),
                'options' => $q['options'] ?? [],
                'min_rating' => $q['minRating'] ?? $q['min_rating'] ?? null,
                'max_rating' => $q['maxRating'] ?? $q['max_rating'] ?? null,
                'logic' => (! empty($q['logic']) && is_array($q['logic'])) ? $q['logic'] : null,
                'sort_order' => $q['order'] ?? $i,
            ]);
        }
    }
}

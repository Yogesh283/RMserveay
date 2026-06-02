<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\User;
use App\Services\PublisherSurveyRewardService;
use App\Services\SelfSurveyIncomeService;
use App\Support\SurveyFormatter;
use App\Support\SurveyRewardCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class MemberSurveyController extends Controller
{
    public function __construct(
        private PublisherSurveyRewardService $rewardService,
        private SurveyRewardCalculator $rewardCalculator,
        private SelfSurveyIncomeService $selfSurveyIncome,
    ) {}

    private function normalizeMemberTier(?string $tier): string
    {
        $allowed = [
            Survey::TIER_FREE,
            Survey::TIER_PANEL,
            Survey::TIER_SUB_PANEL,
            Survey::TIER_SUPER_PANEL,
        ];
        $t = strtolower((string) $tier);

        return in_array($t, $allowed, true) ? $t : Survey::TIER_FREE;
    }

    private function memberEligibleForTier(User $user, string $tier): bool
    {
        $stub = (new Survey)->forceFill(['member_tier' => $tier]);

        return $this->rewardCalculator->eligible($user, $stub);
    }

    /** Active surveys this member has not completed yet (sab tiers ko show, lock=eligible:false). */
    public function available(Request $request): JsonResponse
    {
        $member = $request->user();
        $completedIds = SurveyResponse::query()
            ->where('respondent_user_id', $member->id)
            ->where('completed', true)
            ->pluck('survey_id');

        $surveys = Survey::query()
            ->where('status', 'active')
            ->whereHas('questions')
            ->whereNotIn('id', $completedIds)
            ->orderByDesc('updated_at')
            ->get()
            ->map(function (Survey $s) use ($member) {
                $tier = $this->normalizeMemberTier($s->member_tier);
                $reward = (float) $this->rewardCalculator->rewardFor($member, $s);

                return [
                    'id' => $s->id,
                    'title' => $s->title,
                    'description' => $s->description,
                    'responseCount' => (int) $s->response_count,
                    'estimatedRewardUsd' => $reward,
                    'updatedAt' => $s->updated_at?->toIso8601String(),
                    'memberTier' => $tier,
                    'eligible' => $this->rewardCalculator->eligible($member, $s),
                ];
            });

        return response()->json(['surveys' => $surveys]);
    }

    /** Completed responses by this member (authenticated). */
    public function completed(Request $request): JsonResponse
    {
        $member = $request->user();

        $rows = SurveyResponse::query()
            ->with([
                'survey:id,title,description,member_tier',
                'respondentPayoutWalletTransaction:id,created_at',
            ])
            ->where('respondent_user_id', $member->id)
            ->where('completed', true)
            ->orderByDesc('updated_at')
            ->get();

        $defaultReward = (float) config('publisher.respondent_reward_usd', config('publisher.earning_per_response', 0));
        $delayDays = (int) config('publisher.respondent_payout_delay_days', 7);

        $items = $rows->map(function (SurveyResponse $r) use ($defaultReward, $delayDays) {
            $amount = $r->respondent_reward_usd !== null
                ? (float) $r->respondent_reward_usd
                : $defaultReward;
            /** Paid only after survey wallet credit (see SelfSurveyIncomeService::creditPublisherSurveyResponsePayout). */
            $payoutTx = $r->respondentPayoutWalletTransaction;
            $walletCredited = $payoutTx !== null
                && ($payoutTx->meta['earner_wallet_credited'] ?? true) !== false;
            $payoutSettled = $r->respondent_payout_wallet_tx_id !== null;
            $paymentStatus = $walletCredited ? 'success' : ($payoutSettled ? 'no_wallet_credit' : 'unpaid');

            /** Expected wallet credit time: stored on row, or completion + delay when still uncredited. */
            $expectedAt = $r->respondent_payout_at;
            if ($expectedAt === null && ! $payoutSettled && bccomp((string) $amount, '0', 2) > 0 && $r->updated_at !== null) {
                $expectedAt = $r->updated_at->copy()->addDays($delayDays);
            }

            $hasReward = bccomp((string) $amount, '0', 2) > 0;
            $expectedInWallet = ! $payoutSettled && $hasReward ? $expectedAt?->toIso8601String() : null;
            $walletCreditedAt = $walletCredited
                ? $payoutTx?->created_at?->toIso8601String()
                : null;

            return [
                'responseId' => $r->id,
                'surveyId' => $r->survey_id,
                'title' => $r->survey?->title ?? 'Survey',
                'description' => $r->survey?->description,
                'createdAt' => $r->created_at?->toIso8601String(),
                'completedAt' => $r->updated_at?->toIso8601String(),
                'amountUsd' => $amount,
                'estimatedRewardUsd' => $amount,
                'status' => 'Complete',
                'paymentStatus' => $paymentStatus,
                /** When unpaid: date reward should credit to wallet. When paid: use walletCreditedAt. */
                'expectedInWallet' => $expectedInWallet,
                'walletCreditedAt' => $walletCreditedAt,
                'respondentPayoutAt' => $expectedAt?->toIso8601String(),
                'completionTimeSec' => $r->completion_time_sec,
                'memberTier' => $this->normalizeMemberTier($r->survey?->member_tier),
            ];
        });

        return response()->json([
            'completed' => $items,
            'surveyIncomePayoutDelayDays' => $delayDays,
        ]);
    }

    /** Same validation as public submit; stores respondent_user_id for member lists. */
    public function submitResponse(Request $request, int $id): JsonResponse
    {
        $survey = Survey::query()->with('questions')->whereKey($id)->firstOrFail();

        if ($survey->status !== 'active') {
            abort(422, 'Survey is not accepting responses');
        }

        $member = $request->user();

        $tier = $this->normalizeMemberTier($survey->member_tier);
        if (! $this->memberEligibleForTier($member, $tier)) {
            abort(403, 'You are not eligible for this survey category.');
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

        if ($completed && SurveyResponse::query()
            ->where('survey_id', $survey->id)
            ->where('respondent_user_id', $member->id)
            ->where('completed', true)
            ->exists()) {
            abort(422, 'You already completed this survey.');
        }

        $response = SurveyResponse::query()->create([
            'survey_id' => $survey->id,
            'user_id' => $survey->user_id,
            'respondent_user_id' => $member->id,
            'answers' => $data['answers'],
            'respondent' => $data['respondent'] ?? [],
            'completed' => $completed,
            'drop_off_question_key' => $data['dropOffAtQuestionKey'] ?? null,
            'completion_time_sec' => $data['completionTimeSec'] ?? null,
        ]);

        $survey->increment('response_count');

        $publisherRate = (string) config('publisher.earning_per_response', '0');
        $respondentRate = $this->rewardCalculator->rewardFor($member, $survey);
        $delayDays = (int) config('publisher.respondent_payout_delay_days', 7);

        $instantPaid = false;

        if ($completed && bccomp($respondentRate, '0.00', 2) > 0) {
            $response->respondent_reward_usd = $respondentRate;
            // Delay-window code is intact for future use; currently default = 0 (instant).
            // We still set the field so the cron path remains functional if delay ever returns.
            $response->respondent_payout_at = now()->addDays(max(0, $delayDays));
            $response->save();

            if ($delayDays <= 0) {
                try {
                    $tx = $this->selfSurveyIncome->creditPublisherSurveyResponsePayout($response->fresh());
                    $instantPaid = $tx !== null;
                } catch (Throwable $e) {
                    // Fall back to scheduled payout — log but don't fail the submit.
                    Log::warning('Instant survey payout failed, falling back to scheduled cron', [
                        'response_id' => $response->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        if ($completed && bccomp($publisherRate, '0.00', 2) > 0) {
            $publisher = $survey->publisher()->firstOrFail();
            $this->rewardService->creditCompletedResponse($publisher, $survey->fresh(), $response, $publisherRate);
        }

        return response()->json([
            'response' => ['id' => $response->id],
            'earningAmount' => $completed && bccomp($respondentRate, '0.00', 2) > 0 ? (float) $respondentRate : 0.0,
            'respondentPayoutAt' => $response->respondent_payout_at?->toIso8601String(),
            'payoutDelayDays' => $delayDays,
            'instantPaid' => $instantPaid,
        ], 201);
    }

    /** Member-facing survey JSON (active only). */
    public function show(Request $request, int $id): JsonResponse
    {
        $survey = Survey::query()->with('questions')->whereKey($id)->firstOrFail();

        if ($survey->status !== 'active') {
            abort(404, 'Survey not found');
        }

        $member = $request->user();
        $tier = $this->normalizeMemberTier($survey->member_tier);
        if (! $this->memberEligibleForTier($member, $tier)) {
            abort(403, 'You are not eligible for this survey category.');
        }

        return response()->json(['survey' => SurveyFormatter::surveyToArray($survey, true)]);
    }
}

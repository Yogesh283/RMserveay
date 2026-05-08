<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\WalletTransaction;
use App\Services\PanelMatchingService;
use App\Services\SelfSurveyIncomeService;
use App\Services\SubPanelMatchingService;
use App\Services\SuperSubPanelMatchingService;
use App\Services\SurveyLevelIncomeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MemberProgrammeController extends Controller
{
    public function __construct(
        protected SelfSurveyIncomeService $selfSurveyIncome,
        protected PanelMatchingService $panelMatching,
        protected SubPanelMatchingService $subPanelMatching,
        protected SuperSubPanelMatchingService $superSubPanelMatching,
        protected SurveyLevelIncomeService $surveyLevelIncome,
    ) {}

    public function levelIncome(Request $request): JsonResponse
    {
        return response()->json($this->surveyLevelIncome->status($request->user()));
    }

    public function panelMatching(Request $request): JsonResponse
    {
        return response()->json($this->panelMatching->status($request->user()));
    }

    public function subPanelMatching(Request $request): JsonResponse
    {
        return response()->json($this->subPanelMatching->status($request->user()));
    }

    public function superSubPanelMatching(Request $request): JsonResponse
    {
        return response()->json($this->superSubPanelMatching->status($request->user()));
    }

    public function directIncome(Request $request): JsonResponse
    {
        $user = $request->user();
        $rate = (string) config('direct_income.rate');
        $eligible = $user->qualifiesForDirectIncome();

        return response()->json([
            'eligible' => $eligible,
            'rate' => $rate,
            'rate_percent' => bcmul($rate, '100', 2),
            'requirements' => [
                'active_panelist' => $user->qualifiesActivePanelistIncome(),
                'activation_fee_usd_paid' => $user->activation_fee_paid_at !== null,
                'minimum_panel_fee_usd_paid' => $user->minimum_panel_fee_paid_at !== null,
            ],
            'info' => [
                'has_panel_slot' => ((int) $user->sub_panel_count + (int) $user->super_sub_panel_count) >= 1,
            ],
        ]);
    }

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->reconcileBalancesFromWalletTableIfBlank();
        $user->refresh();
        $c = config('self_survey');
        $breakdown = $this->selfSurveyIncome->perSurveyBreakdown($user);

        $b = $user->balancesForApi();

        return response()->json([
            'wallet_balance' => $b['wallet_balance'],
            'p2p_wallet_balance' => $b['p2p_wallet_balance'],
            'activation_fee_paid' => $user->activation_fee_paid_at !== null,
            'minimum_panel_fee_paid' => $user->minimum_panel_fee_paid_at !== null,
            'active_panelist_qualified' => $user->qualifiesActivePanelistIncome(),
            'sub_panel_count' => (int) $user->sub_panel_count,
            'super_sub_panel_count' => (int) $user->super_sub_panel_count,
            'per_survey_total' => $breakdown['total'],
            'breakdown' => [
                'panelist' => $breakdown['panelist'],
                'active_panelist' => $breakdown['active_panelist'],
                'sub_panels' => $breakdown['sub_panels'],
                'super_sub_panels' => $breakdown['super_sub_panels'],
            ],
            'fees' => [
                'activation_usd' => (string) $c['activation_fee'],
                'minimum_panel_usd' => (string) $c['minimum_panel_fee'],
                'active_panelist_per_survey_usd' => (string) $c['active_panelist_per_survey'],
                'sub_panel_usd' => (string) $c['sub_panel_entry_fee'],
                'sub_panel_per_survey_each_usd' => (string) $c['sub_panel_per_survey_each'],
                'super_sub_panel_usd' => (string) $c['super_sub_panel_entry_fee'],
                'super_sub_panel_per_survey_each_usd' => (string) $c['super_sub_panel_per_survey_each'],
            ],
            'limits' => [
                'sub_panels_max' => (int) $c['max_sub_panels'],
                'super_sub_panels_max' => (int) $c['max_super_sub_panels'],
            ],
        ]);
    }

    public function payActivation(Request $request): JsonResponse
    {
        $user = $request->user();
        $fee = (string) config('self_survey.activation_fee');

        if ($user->activation_fee_paid_at !== null) {
            return response()->json(['message' => 'Activation fee already paid.'], 422);
        }

        $this->selfSurveyIncome->debitFee($user, $fee, WalletTransaction::TYPE_ACTIVATION_FEE);

        $user->refresh();
        $user->activation_fee_paid_at = now();
        $user->save();

        return $this->show($request);
    }

    public function payMinimumPanel(Request $request): JsonResponse
    {
        $user = $request->user();
        $fee = (string) config('self_survey.minimum_panel_fee');

        if ($user->activation_fee_paid_at === null) {
            return response()->json(['message' => 'Pay the activation fee first.'], 422);
        }

        if ($user->minimum_panel_fee_paid_at !== null) {
            return response()->json(['message' => 'Minimum panel fee already paid.'], 422);
        }

        $this->selfSurveyIncome->debitFee($user, $fee, WalletTransaction::TYPE_MINIMUM_PANEL_FEE);

        $user->refresh();
        $user->minimum_panel_fee_paid_at = now();
        $user->save();

        return $this->show($request);
    }

    public function addSubPanel(Request $request): JsonResponse
    {
        $user = $request->user();
        $max = (int) config('self_survey.max_sub_panels');
        $fee = (string) config('self_survey.sub_panel_entry_fee');

        if ((int) $user->sub_panel_count >= $max) {
            return response()->json(['message' => 'Maximum sub panels reached.'], 422);
        }

        $this->selfSurveyIncome->debitFee($user, $fee, WalletTransaction::TYPE_SUB_PANEL_FEE, [
            'panel_index' => (int) $user->sub_panel_count + 1,
        ]);

        $user->refresh();
        $user->sub_panel_count = (int) $user->sub_panel_count + 1;
        $user->save();

        $this->panelMatching->processSubPanelPurchase($user->fresh());

        return $this->show($request);
    }

    public function addSuperSubPanel(Request $request): JsonResponse
    {
        $user = $request->user();
        $max = (int) config('self_survey.max_super_sub_panels');
        $fee = (string) config('self_survey.super_sub_panel_entry_fee');

        if ((int) $user->super_sub_panel_count >= $max) {
            return response()->json(['message' => 'Maximum super panels reached.'], 422);
        }

        $this->selfSurveyIncome->debitFee($user, $fee, WalletTransaction::TYPE_SUPER_SUB_PANEL_FEE, [
            'panel_index' => (int) $user->super_sub_panel_count + 1,
        ]);

        $user->refresh();
        $user->super_sub_panel_count = (int) $user->super_sub_panel_count + 1;
        $user->save();

        $this->superSubPanelMatching->processSuperSubPanelPurchase($user->fresh());

        return $this->show($request);
    }

    public function completeSurvey(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reference' => ['nullable', 'string', 'max:128'],
        ]);

        $this->selfSurveyIncome->creditSurvey(
            $request->user(),
            $validated['reference'] ?? null
        );

        return $this->show($request);
    }
}

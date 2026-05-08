<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\WalletTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MemberDashboardController extends Controller
{
    /**
     * Income types counted as “programme earnings” on the dashboard.
     * These are lifetime SUM(amount) per type from the ledger — not the same as current `users.wallet_balance`
     * (balance is net of debits: fees, panels, withdrawals, transfers, etc.). Survey credits often dominate this total.
     */
    private const PROGRAMME_CREDIT_TYPES = [
        WalletTransaction::TYPE_SURVEY_CREDIT,
        WalletTransaction::TYPE_DIRECT_COMMISSION,
        WalletTransaction::TYPE_PANEL_MATCHING,
        WalletTransaction::TYPE_SUB_PANEL_MATCHING,
        WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING,
        WalletTransaction::TYPE_SURVEY_LEVEL_INCOME,
    ];

    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->reconcileBalancesFromWalletTableIfBlank();
        $user->refresh();
        $uid = $user->id;

        $byType = WalletTransaction::query()
            ->where('user_id', $uid)
            ->selectRaw('type, SUM(amount) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $positiveTotal = function (array $types) use ($byType): string {
            $s = '0';
            foreach ($types as $t) {
                $v = $byType->get($t);
                if ($v === null) {
                    continue;
                }
                $vv = is_numeric($v) ? number_format((float) $v, 2, '.', '') : (string) $v;
                if (bccomp($vv, '0', 2) > 0) {
                    $s = bcadd($s, $vv, 2);
                }
            }

            return $s;
        };

        $direct = $positiveTotal([WalletTransaction::TYPE_DIRECT_COMMISSION]);
        $level = $positiveTotal([WalletTransaction::TYPE_SURVEY_LEVEL_INCOME]);
        $matching = $positiveTotal([
            WalletTransaction::TYPE_PANEL_MATCHING,
            WalletTransaction::TYPE_SUB_PANEL_MATCHING,
            WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING,
        ]);
        $surveyCredits = $positiveTotal([WalletTransaction::TYPE_SURVEY_CREDIT]);

        $totalProgramme = '0';
        foreach (self::PROGRAMME_CREDIT_TYPES as $t) {
            $v = $byType->get($t);
            if ($v === null) {
                continue;
            }
            $vv = is_numeric($v) ? number_format((float) $v, 2, '.', '') : (string) $v;
            if (bccomp($vv, '0', 2) > 0) {
                $totalProgramme = bcadd($totalProgramme, $vv, 2);
            }
        }

        $deposits = $positiveTotal([WalletTransaction::TYPE_DEPOSIT_CREDIT]);
        $p2pIn = $positiveTotal([WalletTransaction::TYPE_P2P_TRANSFER_IN]);

        $surveyCount = WalletTransaction::where('user_id', $uid)
            ->where('type', WalletTransaction::TYPE_SURVEY_CREDIT)
            ->count();

        $plans = config('membership_plans.plans', []);
        $tier = (int) $user->membership_tier;
        $currentPlan = $tier > 0 && isset($plans[$tier - 1]) ? $plans[$tier - 1] : null;
        $nextPlan = isset($plans[$tier]) ? $plans[$tier] : null;

        $completedSurveyIds = SurveyResponse::query()
            ->where('respondent_user_id', $uid)
            ->where('completed', true)
            ->pluck('survey_id');

        $availableQ = Survey::query()->where('status', 'active');
        if ($completedSurveyIds->isNotEmpty()) {
            $availableQ->whereNotIn('id', $completedSurveyIds);
        }
        $availableSurveysCount = $availableQ->count();

        $completedSurveysCount = SurveyResponse::query()
            ->where('respondent_user_id', $uid)
            ->where('completed', true)
            ->count();

        $b = $user->balancesForApi();

        return response()->json([
            'wallet_main_usd' => $b['wallet_balance'],
            'wallet_p2p_usd' => $b['p2p_wallet_balance'],
            'wallet_total_usd' => bcadd($b['wallet_balance'], $b['p2p_wallet_balance'], 2),
            'earnings_summary_usd' => [
                'total_from_programme' => $totalProgramme,
                'direct_income' => $direct,
                'level_income' => $level,
                'matching_income' => $matching,
                'survey_credits' => $surveyCredits,
            ],
            'funding_summary_usd' => [
                'deposits' => $deposits,
                'p2p_received' => $p2pIn,
            ],
            'quick_stats' => [
                'survey_credits_count' => $surveyCount,
                'membership_tier' => $tier,
                'current_plan_name' => $currentPlan['name'] ?? null,
                'next_plan_name' => $nextPlan['name'] ?? null,
                'available_surveys_count' => $availableSurveysCount,
                'completed_surveys_count' => $completedSurveysCount,
                'sub_panel_count' => (int) $user->sub_panel_count,
                'super_sub_panel_count' => (int) $user->super_sub_panel_count,
                'active_panels_count' => (int) $user->sub_panel_count + (int) $user->super_sub_panel_count,
            ],
        ]);
    }
}

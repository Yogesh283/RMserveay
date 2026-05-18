<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\WalletTransaction;
use Carbon\CarbonImmutable;
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
        WalletTransaction::TYPE_ACTIVE_PANEL_MATCHING,
        WalletTransaction::TYPE_PANEL_MATCHING,
        WalletTransaction::TYPE_SUB_PANEL_MATCHING,
        WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING,
        WalletTransaction::TYPE_SURVEY_LEVEL_INCOME,
    ];

    /** All matching wallet types — fed by `binary:daily-closing` (active/panel/super) + legacy sub_panel. */
    private const MATCHING_CREDIT_TYPES = [
        WalletTransaction::TYPE_ACTIVE_PANEL_MATCHING,
        WalletTransaction::TYPE_PANEL_MATCHING,
        WalletTransaction::TYPE_SUB_PANEL_MATCHING,
        WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING,
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
        $matching = $positiveTotal(self::MATCHING_CREDIT_TYPES);
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

        /**
         * Today's earnings = sum of all positive programme credits posted today
         * (direct + level + matching family + survey credits). Used by the dashboard
         * "Today's Earnings" tile to give a single-day all-income figure.
         */
        $todayPositiveByType = WalletTransaction::query()
            ->where('user_id', $uid)
            ->whereIn('type', self::PROGRAMME_CREDIT_TYPES)
            ->whereDate('created_at', now()->toDateString())
            ->selectRaw('type, SUM(amount) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $todaySum = function (array $types) use ($todayPositiveByType): string {
            $s = '0';
            foreach ($types as $t) {
                $v = $todayPositiveByType->get($t);
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

        $todayDirect = $todaySum([WalletTransaction::TYPE_DIRECT_COMMISSION]);
        $todayLevel = $todaySum([WalletTransaction::TYPE_SURVEY_LEVEL_INCOME]);
        $todayMatching = $todaySum(self::MATCHING_CREDIT_TYPES);
        $todaySurvey = $todaySum([WalletTransaction::TYPE_SURVEY_CREDIT]);
        $todayTotal = bcadd(bcadd(bcadd($todayDirect, $todayLevel, 2), $todayMatching, 2), $todaySurvey, 2);

        /**
         * Weekly earnings — Monday → Sunday of the user's current ISO week.
         * Returned as 7 day-buckets (always 7 even if zero) so the frontend chart can
         * render Mon..Sun consistently.
         */
        $weekStart = CarbonImmutable::now()->startOfWeek(CarbonImmutable::MONDAY);
        $weekEnd = $weekStart->endOfWeek(CarbonImmutable::SUNDAY);
        $weekRows = WalletTransaction::query()
            ->where('user_id', $uid)
            ->whereIn('type', self::PROGRAMME_CREDIT_TYPES)
            ->whereBetween('created_at', [$weekStart->toDateTimeString(), $weekEnd->toDateTimeString()])
            ->selectRaw('DATE(created_at) as d, type, SUM(amount) as total')
            ->groupBy('d', 'type')
            ->get();

        $weekBuckets = [];
        for ($i = 0; $i < 7; $i++) {
            $day = $weekStart->addDays($i);
            $weekBuckets[$day->toDateString()] = [
                'date' => $day->toDateString(),
                'day_label' => $day->format('D'),
                'direct' => '0.00',
                'matching' => '0.00',
                'level' => '0.00',
                'survey' => '0.00',
                'total' => '0.00',
            ];
        }
        foreach ($weekRows as $row) {
            $key = $row->d;
            if (! isset($weekBuckets[$key])) {
                continue;
            }
            $val = number_format((float) $row->total, 2, '.', '');
            if (bccomp($val, '0', 2) <= 0) {
                continue;
            }
            $bucket = $weekBuckets[$key];
            if ($row->type === WalletTransaction::TYPE_DIRECT_COMMISSION) {
                $bucket['direct'] = bcadd($bucket['direct'], $val, 2);
            } elseif (in_array($row->type, self::MATCHING_CREDIT_TYPES, true)) {
                $bucket['matching'] = bcadd($bucket['matching'], $val, 2);
            } elseif ($row->type === WalletTransaction::TYPE_SURVEY_LEVEL_INCOME) {
                $bucket['level'] = bcadd($bucket['level'], $val, 2);
            } elseif ($row->type === WalletTransaction::TYPE_SURVEY_CREDIT) {
                $bucket['survey'] = bcadd($bucket['survey'], $val, 2);
            }
            $bucket['total'] = bcadd($bucket['total'], $val, 2);
            $weekBuckets[$key] = $bucket;
        }
        $weekDaily = array_values($weekBuckets);

        $weekTotalDirect = '0.00';
        $weekTotalMatching = '0.00';
        $weekTotalLevel = '0.00';
        $weekTotalSurvey = '0.00';
        foreach ($weekDaily as $bucket) {
            $weekTotalDirect = bcadd($weekTotalDirect, $bucket['direct'], 2);
            $weekTotalMatching = bcadd($weekTotalMatching, $bucket['matching'], 2);
            $weekTotalLevel = bcadd($weekTotalLevel, $bucket['level'], 2);
            $weekTotalSurvey = bcadd($weekTotalSurvey, $bucket['survey'], 2);
        }
        $weekOther = bcadd($weekTotalLevel, $weekTotalSurvey, 2);
        $weekTotal = bcadd(bcadd($weekTotalDirect, $weekTotalMatching, 2), $weekOther, 2);

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

        $cfg = config('self_survey');
        $subCount = (int) $user->sub_panel_count;
        $superCount = (int) $user->super_sub_panel_count;
        $maxSub = (int) ($cfg['max_sub_panels'] ?? 9);
        $maxSuper = (int) ($cfg['max_super_sub_panels'] ?? 9);
        $activationPaid = $user->activation_fee_paid_at !== null;
        $minimumPanelPaid = $user->minimum_panel_fee_paid_at !== null;

        /**
         * Per-panel running state for the dashboard. `running` = the panel is currently
         * active (paid/owned by the member). `next_action` tells the UI which panel is
         * the natural next purchase, used to highlight the live one.
         */
        $panelStatus = [
            [
                'key' => 'activation',
                'label' => 'ID Activation',
                'fee_usd' => (string) ($cfg['activation_fee'] ?? '1.00'),
                'running' => $activationPaid,
                'completed' => $activationPaid,
                'count' => $activationPaid ? 1 : 0,
                'max' => 1,
                'cta_to' => '/member/active-panels',
            ],
            [
                'key' => 'minimum_panel',
                'label' => 'Minimum Panel',
                'fee_usd' => (string) ($cfg['minimum_panel_fee'] ?? '10.00'),
                'running' => $minimumPanelPaid,
                'completed' => $minimumPanelPaid,
                'count' => $minimumPanelPaid ? 1 : 0,
                'max' => 1,
                'cta_to' => '/member/active-panels',
            ],
            [
                'key' => 'sub_panel',
                'label' => 'Sub Panels',
                'fee_usd' => (string) ($cfg['sub_panel_entry_fee'] ?? '10.00'),
                'running' => $subCount > 0,
                'completed' => $subCount >= $maxSub,
                'count' => $subCount,
                'max' => $maxSub,
                'cta_to' => '/member/sub-panels',
            ],
            [
                'key' => 'super_sub_panel',
                'label' => 'Super Sub Panels',
                'fee_usd' => (string) ($cfg['super_sub_panel_entry_fee'] ?? '100.00'),
                'running' => $superCount > 0,
                'completed' => $superCount >= $maxSuper,
                'count' => $superCount,
                'max' => $maxSuper,
                'cta_to' => '/member/super-sub-panels',
            ],
        ];

        $nextActionKey = null;
        foreach ($panelStatus as $p) {
            if (! $p['completed']) {
                $nextActionKey = $p['key'];
                break;
            }
        }

        return response()->json([
            'wallet_main_usd' => $b['wallet_balance'],
            'wallet_p2p_usd' => $b['p2p_wallet_balance'],
            'wallet_survey_usd' => $b['survey_wallet_balance'],
            'wallet_total_usd' => bcadd(
                bcadd($b['wallet_balance'], $b['p2p_wallet_balance'], 2),
                $b['survey_wallet_balance'],
                2
            ),
            'earnings_summary_usd' => [
                'total_from_programme' => $totalProgramme,
                'direct_income' => $direct,
                'level_income' => $level,
                'matching_income' => $matching,
                'survey_credits' => $surveyCredits,
            ],
            'today_earnings_usd' => [
                'total' => $todayTotal,
                'direct_income' => $todayDirect,
                'level_income' => $todayLevel,
                'matching_income' => $todayMatching,
                'survey_credits' => $todaySurvey,
            ],
            'weekly_earnings_usd' => [
                'week_start' => $weekStart->toDateString(),
                'week_end' => $weekEnd->toDateString(),
                'daily' => $weekDaily,
                'total' => $weekTotal,
                'direct' => $weekTotalDirect,
                'matching' => $weekTotalMatching,
                'level' => $weekTotalLevel,
                'survey' => $weekTotalSurvey,
                'other' => $weekOther,
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
                'sub_panel_count' => $subCount,
                'super_sub_panel_count' => $superCount,
                'active_panels_count' => $subCount + $superCount,
            ],
            'panel_status' => [
                'panels' => $panelStatus,
                'next_action_key' => $nextActionKey,
                'running_count' => count(array_filter($panelStatus, fn ($p) => $p['running'])),
            ],
        ]);
    }
}

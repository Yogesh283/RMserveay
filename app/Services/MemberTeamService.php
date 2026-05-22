<?php

namespace App\Services;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Support\BinaryClosingCalendar;
use App\Support\BinaryWeakSideLapse;
use Carbon\CarbonImmutable;

class MemberTeamService
{
    public function __construct(
        protected PanelMatchingService $panelMatching,
        protected SubPanelMatchingService $subPanelMatching,
        protected SuperSubPanelMatchingService $superSubPanelMatching,
        protected SurveyLevelIncomeService $surveyLevelIncome,
        protected ActivePanelMatchingService $activePanelMatching,
        protected BinarySubtreeVolumeService $subtreeVolumes,
    ) {}

    /**
     * BFS collect all user IDs in binary subtree under $startId (inclusive of start).
     *
     * Dummy test users (created by `php artisan dummy:place`) are skipped so
     * any aggregation built on top of these IDs (counts, active panelists,
     * carry totals) reflects only real members.
     *
     * @return list<int>
     */
    public function collectBinarySubtreeIds(?int $startId): array
    {
        if ($startId === null) {
            return [];
        }

        $ids = [];
        $queue = [$startId];
        while ($queue !== []) {
            $id = array_shift($queue);
            if (in_array($id, $ids, true)) {
                continue;
            }
            $u = User::query()->whereKey($id)->first(['id', 'email', 'left_child_id', 'right_child_id']);
            if ($u === null) {
                continue;
            }
            if (! $u->isDummy()) {
                $ids[] = $id;
            }
            if ($u->left_child_id) {
                $queue[] = (int) $u->left_child_id;
            }
            if ($u->right_child_id) {
                $queue[] = (int) $u->right_child_id;
            }
        }

        return $ids;
    }

    /**
     * @return array{
     *     count:int,
     *     total_active:int, total_sub_panels:int, total_super_sub_panels:int,
     *     active:int, sub_panels:int, super_sub_panels:int
     * }
     */
    public function aggregateLeg(User $root, string $leg): array
    {
        $leg = strtolower($leg);
        $startId = $leg === 'left' ? $root->left_child_id : $root->right_child_id;
        $ids = $this->collectBinarySubtreeIds($startId !== null ? (int) $startId : null);
        if ($ids === []) {
            return [
                'count' => 0,
                'total_active' => 0,
                'total_sub_panels' => 0,
                'total_super_sub_panels' => 0,
                'active' => 0,
                'sub_panels' => 0,
                'super_sub_panels' => 0,
            ];
        }

        $rows = User::query()
            ->whereIn('id', $ids)
            ->get([
                'id',
                'sub_panel_count',
                'super_sub_panel_count',
                'activation_fee_paid_at',
                'minimum_panel_fee_paid_at',
            ]);

        $totalActive = 0;
        $totalSub = 0;
        $totalSuper = 0;
        foreach ($rows as $u) {
            if ($u->qualifiesActivePanelistIncome()) {
                $totalActive++;
            }
            $totalSub += (int) $u->sub_panel_count;
            $totalSuper += (int) $u->super_sub_panel_count;
        }

        [$start, $end] = $this->yesterdayBounds();

        $activeYesterday = User::query()
            ->whereIn('id', $ids)
            ->whereBetween('minimum_panel_fee_paid_at', [$start, $end])
            ->count();

        $subYesterday = WalletTransaction::query()
            ->whereIn('user_id', $ids)
            ->where('type', WalletTransaction::TYPE_SUB_PANEL_FEE)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $superYesterday = WalletTransaction::query()
            ->whereIn('user_id', $ids)
            ->where('type', WalletTransaction::TYPE_SUPER_SUB_PANEL_FEE)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        return [
            'count' => count($ids),
            'total_active' => $totalActive,
            'total_sub_panels' => $totalSub,
            'total_super_sub_panels' => $totalSuper,
            'active' => $activeYesterday,
            'sub_panels' => $subYesterday,
            'super_sub_panels' => $superYesterday,
        ];
    }

    /**
     * @return array{0: \Illuminate\Support\Carbon, 1: \Illuminate\Support\Carbon}
     */
    private function yesterdayBounds(): array
    {
        return BinaryClosingCalendar::dateLocalBounds(BinaryClosingCalendar::yesterdayDateString());
    }

    /**
     * Team-page binary math: lifetime leg totals, yesterday match on carry buckets, carry forward on strong leg only.
     *
     * @param  array<string, mixed>  $leftLeg
     * @param  array<string, mixed>  $rightLeg
     * @return array<string, mixed>
     */
    private function buildTeamLegMatch(User $user, string $scope, array $leftLeg, array $rightLeg): array
    {
        $yesterday = BinaryClosingCalendar::yesterdayDateString();
        $maxPairs = match ($scope) {
            BinaryDailyClosing::SCOPE_ACTIVE_PANEL => (int) config('binary_closing.scopes.active_panel.max_pairs_per_day', 20),
            BinaryDailyClosing::SCOPE_SUPER => (int) config('binary_closing.scopes.super.max_pairs_per_day', 20),
            default => (int) config('binary_closing.scopes.panel.max_pairs_per_day', 20),
        };

        $inputs = $this->subtreeVolumes->closingMatchInputs($user, $scope);
        $totalL = (int) $inputs['total_left'];
        $totalR = (int) $inputs['total_right'];
        $totalSplit = BinaryWeakSideLapse::splitFromLegCounts($totalL, $totalR, $maxPairs);
        $matchSplit = BinaryWeakSideLapse::splitFromLegCounts(
            (int) $inputs['left_in'],
            (int) $inputs['right_in'],
            $maxPairs,
        );

        $closing = BinaryDailyClosing::query()
            ->where('user_id', $user->id)
            ->where('scope', $scope)
            ->whereDate('closing_date', $yesterday)
            ->orderByDesc('id')
            ->first();

        $incomeEligible = $user->qualifiesActivePanelistIncome();

        if ($closing !== null) {
            $pairsMatched = (int) $closing->pairs_matched;
            $carryForwardL = (int) $closing->left_carry_out;
            $carryForwardR = (int) $closing->right_carry_out;
            $matchLeft = (int) $closing->left_carry_in;
            $matchRight = (int) $closing->right_carry_in;
            $payoutUsd = number_format((float) $closing->payout_usd, 2, '.', '');
            $meta = is_array($closing->meta) ? $closing->meta : [];
            $milestoneUsd = (string) ($meta['milestone_paid_usd'] ?? '0.00');
            $weak = BinaryWeakSideLapse::fromClosing($closing);
        } else {
            $pairsMatched = (int) $matchSplit['pairs_matched'];
            $carryForwardL = (int) $matchSplit['left_out'];
            $carryForwardR = (int) $matchSplit['right_out'];
            $matchLeft = (int) $inputs['left_in'];
            $matchRight = (int) $inputs['right_in'];
            $milestoneUsd = $incomeEligible ? $this->projectedMilestoneUsd($scope, $pairsMatched) : '0.00';
            $perPair = match ($scope) {
                BinaryDailyClosing::SCOPE_ACTIVE_PANEL => (string) config('binary_closing.scopes.active_panel.pair_income_usd', '1.00'),
                default => '0.00',
            };
            $payoutUsd = $incomeEligible
                ? bcadd(bcmul((string) $pairsMatched, $perPair, 2), $milestoneUsd, 2)
                : '0.00';
            $weak = [
                'side' => $matchSplit['weak_side'],
                'lapsed' => $matchSplit['weak_lapsed'],
            ];
        }

        [$carryL, $carryR] = $this->scopeCarryBuckets($user, $scope);
        $todayLeg = $this->subtreeVolumes->todayLegVolumes($user, $scope);
        $todayNewL = (int) $todayLeg['left'];
        $todayNewR = (int) $todayLeg['right'];
        $todayMatchL = $carryL + $todayNewL;
        $todayMatchR = $carryR + $todayNewR;
        $todaySplit = BinaryWeakSideLapse::splitFromLegCounts($todayMatchL, $todayMatchR, $maxPairs);

        return [
            'team_volume_date' => $yesterday,
            'today_date' => BinaryClosingCalendar::todayDateString(),
            'total_left' => $totalL,
            'total_right' => $totalR,
            'total_pairs_matched' => min(min($totalL, $totalR), $maxPairs),
            'total_carry_left' => (int) $totalSplit['left_out'],
            'total_carry_right' => (int) $totalSplit['right_out'],
            'yesterday_new_left' => (int) $inputs['yesterday_left'],
            'yesterday_new_right' => (int) $inputs['yesterday_right'],
            'yesterday_match_left' => $matchLeft,
            'yesterday_match_right' => $matchRight,
            'opening_carry_left' => (int) $inputs['opening_left_out'],
            'opening_carry_right' => (int) $inputs['opening_right_out'],
            'pairs_matched' => $pairsMatched,
            'carry_forward_left' => $carryForwardL,
            'carry_forward_right' => $carryForwardR,
            'payout_usd' => $payoutUsd,
            'milestone_paid_usd' => $milestoneUsd,
            'today_weak_side' => $weak['side'] ?? null,
            'today_weak_lapsed' => (int) ($weak['lapsed'] ?? 0),
            'today_left_lapsed' => ($weak['side'] ?? '') === 'left' ? (int) ($weak['lapsed'] ?? 0) : 0,
            'today_right_lapsed' => ($weak['side'] ?? '') === 'right' ? (int) ($weak['lapsed'] ?? 0) : 0,
            'today_new_left' => $todayNewL,
            'today_new_right' => $todayNewR,
            'today_match_left' => $todayMatchL,
            'today_match_right' => $todayMatchR,
            'today_pairs_matched' => (int) $todaySplit['pairs_matched'],
            'income_eligible' => $incomeEligible,
        ];
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function scopeCarryBuckets(User $user, string $scope): array
    {
        return match ($scope) {
            BinaryDailyClosing::SCOPE_ACTIVE_PANEL => [
                (int) $user->active_panel_match_carry_left,
                (int) $user->active_panel_match_carry_right,
            ],
            BinaryDailyClosing::SCOPE_SUPER => [
                (int) $user->super_panel_match_carry_left,
                (int) $user->super_panel_match_carry_right,
            ],
            default => [
                (int) $user->panel_match_carry_left,
                (int) $user->panel_match_carry_right,
            ],
        };
    }

    private function projectedMilestoneUsd(string $scope, int $pairsMatched): string
    {
        if ($pairsMatched <= 0) {
            return '0.00';
        }

        if ($scope === BinaryDailyClosing::SCOPE_ACTIVE_PANEL) {
            return '0.00';
        }

        $milestones = $scope === BinaryDailyClosing::SCOPE_SUPER
            ? config('super_sub_panel_matching.milestones', [])
            : config('sub_panel_matching.milestones', []);

        $hit = 0;
        foreach ($milestones as $m) {
            if ($pairsMatched >= (int) $m) {
                $hit = (int) $m;
            }
        }

        if ($scope === BinaryDailyClosing::SCOPE_SUPER) {
            $mult = (string) config('super_sub_panel_matching.income_multiplier', '10');

            return bcmul((string) $hit, $mult, 2);
        }

        return number_format((float) $hit, 2, '.', '');
    }

    /**
     * @param  array<string, mixed>  $status
     * @return array<string, mixed>
     */
    private function matchingForTeamYesterday(User $user, string $scope, array $status, array $leftLeg, array $rightLeg): array
    {
        $snap = $this->buildTeamLegMatch($user, $scope, $leftLeg, $rightLeg);
        $weakSide = $snap['today_weak_side'] ?? null;

        return array_merge($status, [
            'eligible' => (bool) $snap['income_eligible'],
            'income_eligible' => (bool) $snap['income_eligible'],
            'income_blocked_reason' => $snap['income_eligible'] ? null : 'inactive_panelist',
            'earned_today_usd' => $snap['payout_usd'],
            'today_milestone_paid_usd' => $snap['milestone_paid_usd'],
            'today_left_carry_in' => $snap['yesterday_match_left'],
            'today_right_carry_in' => $snap['yesterday_match_right'],
            'today_left_carry_out' => $snap['carry_forward_left'],
            'today_right_carry_out' => $snap['carry_forward_right'],
            'today_left_lapsed' => $snap['today_left_lapsed'],
            'today_right_lapsed' => $snap['today_right_lapsed'],
            'today_weak_side' => $weakSide,
            'today_weak_lapsed' => $snap['today_weak_lapsed'],
            'pairs_matched_yesterday' => $snap['pairs_matched'],
            'team_volume_period' => 'yesterday',
            'team_volume_date' => $snap['team_volume_date'],
        ]);
    }

    /**
     * Per sponsor generation (1 = your directs, 2 = next generation, …), aligned with survey level-income depth.
     *
     * @return array<int, array{team_members: int, active_panelists: int, sub_panel_slots: int, super_sub_panel_slots: int}>
     */
    private function sponsorTreeStatsByLevel(User $root): array
    {
        $max = (int) config('level_income.max_levels');
        $makeEmpty = static fn (): array => [
            'team_members' => 0,
            'active_panelists' => 0,
            'sub_panel_slots' => 0,
            'super_sub_panel_slots' => 0,
        ];

        $out = [];
        for ($i = 1; $i <= $max; $i++) {
            $out[$i] = $makeEmpty();
        }

        $currentIds = User::query()
            ->where('sponsor_id', $root->id)
            ->excludeDummy()
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $depth = 1;

        [$start, $end] = $this->yesterdayBounds();

        while ($depth <= $max && $currentIds !== []) {
            $users = User::query()
                ->whereIn('id', $currentIds)
                ->excludeDummy()
                ->get([
                    'id',
                    'minimum_panel_fee_paid_at',
                ]);

            foreach ($users as $u) {
                $out[$depth]['team_members']++;
                if ($u->minimum_panel_fee_paid_at !== null
                    && $u->minimum_panel_fee_paid_at->between($start, $end)) {
                    $out[$depth]['active_panelists']++;
                }
                $out[$depth]['sub_panel_slots'] += (int) WalletTransaction::query()
                    ->where('user_id', $u->id)
                    ->where('type', WalletTransaction::TYPE_SUB_PANEL_FEE)
                    ->whereBetween('created_at', [$start, $end])
                    ->count();
                $out[$depth]['super_sub_panel_slots'] += (int) WalletTransaction::query()
                    ->where('user_id', $u->id)
                    ->where('type', WalletTransaction::TYPE_SUPER_SUB_PANEL_FEE)
                    ->whereBetween('created_at', [$start, $end])
                    ->count();
            }

            $currentIds = User::query()
                ->whereIn('sponsor_id', $currentIds)
                ->excludeDummy()
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
            $depth++;
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    public function overview(User $user): array
    {
        $user->refresh();

        $direct = User::query()
            ->where('sponsor_id', $user->id)
            ->excludeDummy()
            ->orderBy('id')
            ->get([
                'id', 'name', 'email', 'login_uid', 'referral_code', 'created_at',
                'activation_fee_paid_at', 'minimum_panel_fee_paid_at',
            ]);

        $directList = $direct->map(function (User $d) {
            return [
                'id' => $d->id,
                'name' => $d->name,
                'email' => $d->email,
                'login_uid' => $d->login_uid,
                'referral_code' => $d->referral_code,
                'joined_at' => $d->created_at?->toIso8601String(),
                'is_active' => $d->qualifiesActivePanelistIncome(),
            ];
        })->values()->all();

        $leftLeg = $this->aggregateLeg($user, 'left');
        $rightLeg = $this->aggregateLeg($user, 'right');
        $yesterdayDate = BinaryClosingCalendar::yesterdayDateString();
        $leftIds = $this->collectBinarySubtreeIds($user->left_child_id !== null ? (int) $user->left_child_id : null);
        $rightIds = $this->collectBinarySubtreeIds($user->right_child_id !== null ? (int) $user->right_child_id : null);
        $networkCount = count(array_unique(array_merge($leftIds, $rightIds)));

        [$start, $end] = $this->yesterdayBounds();
        $activeNetwork = 0;
        if ($leftIds !== [] || $rightIds !== []) {
            $allNet = array_unique(array_merge($leftIds, $rightIds));
            $activeNetwork = User::query()
                ->whereIn('id', $allNet)
                ->whereBetween('minimum_panel_fee_paid_at', [$start, $end])
                ->count();
        }

        return [
            'direct' => [
                'count' => count($directList),
                'members' => $directList,
            ],
            'network' => [
                'total_members' => $networkCount,
                'active_members' => $activeNetwork,
            ],
            'self' => [
                'referral_code' => (string) $user->referral_code,
                'sub_panel_count' => (int) $user->sub_panel_count,
                'super_sub_panel_count' => (int) $user->super_sub_panel_count,
                'is_active' => $user->qualifiesActivePanelistIncome(),
            ],
            'legs' => [
                'left' => $leftLeg,
                'right' => $rightLeg,
            ],
            'team_volume' => [
                'period' => 'yesterday',
                'date' => $yesterdayDate,
                'today_date' => BinaryClosingCalendar::todayDateString(),
            ],
            'leg_match' => [
                'active_panel' => $this->buildTeamLegMatch($user, BinaryDailyClosing::SCOPE_ACTIVE_PANEL, $leftLeg, $rightLeg),
                'panel' => $this->buildTeamLegMatch($user, BinaryDailyClosing::SCOPE_PANEL, $leftLeg, $rightLeg),
                'super' => $this->buildTeamLegMatch($user, BinaryDailyClosing::SCOPE_SUPER, $leftLeg, $rightLeg),
            ],
            'matching' => [
                'active_panel' => $this->matchingForTeamYesterday(
                    $user,
                    BinaryDailyClosing::SCOPE_ACTIVE_PANEL,
                    $this->activePanelMatching->status($user),
                    $leftLeg,
                    $rightLeg,
                ),
                'panel' => $this->matchingForTeamYesterday(
                    $user,
                    BinaryDailyClosing::SCOPE_PANEL,
                    $this->panelMatching->status($user),
                    $leftLeg,
                    $rightLeg,
                ),
                'sub_panel' => $this->matchingForTeamYesterday(
                    $user,
                    BinaryDailyClosing::SCOPE_PANEL,
                    $this->subPanelMatching->status($user),
                    $leftLeg,
                    $rightLeg,
                ),
                'super_sub_panel' => $this->matchingForTeamYesterday(
                    $user,
                    BinaryDailyClosing::SCOPE_SUPER,
                    $this->superSubPanelMatching->status($user),
                    $leftLeg,
                    $rightLeg,
                ),
            ],
            'level_income' => $this->levelIncomeOverviewWithTeamByLevel($user),
        ];
    }

    /**
     * Survey level income snapshot plus sponsor-generation team counts per level (for team page).
     *
     * @return array<string, mixed>
     */
    private function levelIncomeOverviewWithTeamByLevel(User $user): array
    {
        $levelIncome = $this->surveyLevelIncome->status($user);
        $byLevel = $this->sponsorTreeStatsByLevel($user);

        foreach ($levelIncome['levels'] as &$row) {
            $l = (int) $row['level'];
            $st = $byLevel[$l] ?? [
                'team_members' => 0,
                'active_panelists' => 0,
                'sub_panel_slots' => 0,
                'super_sub_panel_slots' => 0,
            ];
            $row['team_members'] = $st['team_members'];
            $row['active_panelists'] = $st['active_panelists'];
            $row['sub_panel_slots'] = $st['sub_panel_slots'];
            $row['super_sub_panel_slots'] = $st['super_sub_panel_slots'];
        }
        unset($row);

        return $levelIncome;
    }

    /**
     * Walk past dummy chains so the tree renderer never sees them.
     * Returns the first non-dummy descendant on the same side, or null.
     */
    private function firstRealDescendant(?User $u, string $side): ?User
    {
        $hops = 0;
        while ($u !== null && $u->isDummy() && $hops < 64) {
            $childId = $side === 'left' ? $u->left_child_id : $u->right_child_id;
            $u = $childId ? User::find($childId) : null;
            $hops++;
        }

        return $u;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function nodePayload(User $u, int $remainingDepth): ?array
    {
        if ($remainingDepth < 0) {
            return null;
        }

        $sub = (int) $u->sub_panel_count;
        $super = (int) $u->super_sub_panel_count;
        $active = $u->qualifiesActivePanelistIncome();

        $node = [
            'id' => $u->id,
            'name' => $u->name,
            'login_uid' => $u->login_uid,
            'referral_code' => $u->referral_code,
            'sub_panel_count' => $sub,
            'super_sub_panel_count' => $super,
            'is_active' => $active,
            'kind' => $super > 0 ? 'super' : ($sub > 0 ? 'sub' : 'member'),
            /** Tree clients use these to show "click to expand" on truncated leaves. */
            'has_left' => $u->left_child_id !== null,
            'has_right' => $u->right_child_id !== null,
        ];

        if ($remainingDepth === 0) {
            $node['left'] = null;
            $node['right'] = null;

            return $node;
        }

        $left = $u->left_child_id ? User::find($u->left_child_id) : null;
        $right = $u->right_child_id ? User::find($u->right_child_id) : null;

        // Dummy chains are invisible — recurse into their first real descendant.
        $left = $this->firstRealDescendant($left, 'left');
        $right = $this->firstRealDescendant($right, 'right');

        $node['left'] = $left ? $this->nodePayload($left, $remainingDepth - 1) : null;
        $node['right'] = $right ? $this->nodePayload($right, $remainingDepth - 1) : null;

        return $node;
    }

    /**
     * Binary tree from your position (left leg = left team, right leg = right team).
     *
     * @return array<string, mixed>
     */
    public function binaryPreview(User $user, int $depth): array
    {
        $depth = max(1, min(100, $depth));

        return [
            'depth' => $depth,
            'tree' => $this->nodePayload($user->fresh(), $depth),
        ];
    }
}

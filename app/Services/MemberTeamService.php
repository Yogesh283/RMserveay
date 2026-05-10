<?php

namespace App\Services;

use App\Models\User;

class MemberTeamService
{
    public function __construct(
        protected PanelMatchingService $panelMatching,
        protected SubPanelMatchingService $subPanelMatching,
        protected SuperSubPanelMatchingService $superSubPanelMatching,
        protected SurveyLevelIncomeService $surveyLevelIncome,
        protected ActivePanelMatchingService $activePanelMatching,
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
     *     count:int, active:int, sub_panels:int, super_sub_panels:int,
     *     carry_active_left:int, carry_active_right:int,
     *     carry_panel_left:int, carry_panel_right:int, carry_super_left:int, carry_super_right:int,
     *     sub_matching_cumulative_today:int, super_matching_cumulative_today:int
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
                'active' => 0,
                'sub_panels' => 0,
                'super_sub_panels' => 0,
                'carry_active_left' => 0,
                'carry_active_right' => 0,
                'carry_panel_left' => 0,
                'carry_panel_right' => 0,
                'carry_super_left' => 0,
                'carry_super_right' => 0,
                'sub_matching_cumulative_today' => 0,
                'super_matching_cumulative_today' => 0,
            ];
        }

        $rows = User::query()->whereIn('id', $ids)->get([
            'id', 'sub_panel_count', 'super_sub_panel_count',
            'active_panel_match_carry_left', 'active_panel_match_carry_right',
            'panel_match_carry_left', 'panel_match_carry_right',
            'super_panel_match_carry_left', 'super_panel_match_carry_right',
            'activation_fee_paid_at', 'minimum_panel_fee_paid_at',
            'spm_match_day', 'spm_cumulative_panels',
            'sspm_match_day', 'sspm_cumulative_panels',
        ]);

        $active = 0;
        $subPanels = 0;
        $superSub = 0;
        $cal = 0;
        $car = 0;
        $cpl = 0;
        $cpr = 0;
        $csl = 0;
        $csr = 0;
        $spmToday = 0;
        $sspmToday = 0;

        foreach ($rows as $u) {
            if ($u->qualifiesActivePanelistIncome()) {
                $active++;
            }
            $subPanels += (int) $u->sub_panel_count;
            $superSub += (int) $u->super_sub_panel_count;
            $cal += (int) $u->active_panel_match_carry_left;
            $car += (int) $u->active_panel_match_carry_right;
            $cpl += (int) $u->panel_match_carry_left;
            $cpr += (int) $u->panel_match_carry_right;
            $csl += (int) $u->super_panel_match_carry_left;
            $csr += (int) $u->super_panel_match_carry_right;
            if ($u->spm_match_day !== null && now()->isSameDay($u->spm_match_day)) {
                $spmToday += (int) $u->spm_cumulative_panels;
            }
            if ($u->sspm_match_day !== null && now()->isSameDay($u->sspm_match_day)) {
                $sspmToday += (int) $u->sspm_cumulative_panels;
            }
        }

        return [
            'count' => count($ids),
            'active' => $active,
            'sub_panels' => $subPanels,
            'super_sub_panels' => $superSub,
            'carry_active_left' => $cal,
            'carry_active_right' => $car,
            'carry_panel_left' => $cpl,
            'carry_panel_right' => $cpr,
            'carry_super_left' => $csl,
            'carry_super_right' => $csr,
            'sub_matching_cumulative_today' => $spmToday,
            'super_matching_cumulative_today' => $sspmToday,
        ];
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

        while ($depth <= $max && $currentIds !== []) {
            $users = User::query()
                ->whereIn('id', $currentIds)
                ->excludeDummy()
                ->get([
                    'sub_panel_count', 'super_sub_panel_count',
                    'activation_fee_paid_at', 'minimum_panel_fee_paid_at',
                ]);

            foreach ($users as $u) {
                $out[$depth]['team_members']++;
                if ($u->qualifiesActivePanelistIncome()) {
                    $out[$depth]['active_panelists']++;
                }
                $out[$depth]['sub_panel_slots'] += (int) $u->sub_panel_count;
                $out[$depth]['super_sub_panel_slots'] += (int) $u->super_sub_panel_count;
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
        $leftIds = $this->collectBinarySubtreeIds($user->left_child_id !== null ? (int) $user->left_child_id : null);
        $rightIds = $this->collectBinarySubtreeIds($user->right_child_id !== null ? (int) $user->right_child_id : null);
        $networkCount = count(array_unique(array_merge($leftIds, $rightIds)));

        $activeNetwork = 0;
        if ($leftIds !== [] || $rightIds !== []) {
            $allNet = array_unique(array_merge($leftIds, $rightIds));
            $activeNetwork = User::query()->whereIn('id', $allNet)->get()->filter(fn (User $u) => $u->qualifiesActivePanelistIncome())->count();
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
            'matching' => [
                'active_panel' => $this->activePanelMatching->status($user),
                'panel' => $this->panelMatching->status($user),
                'sub_panel' => $this->subPanelMatching->status($user),
                'super_sub_panel' => $this->superSubPanelMatching->status($user),
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

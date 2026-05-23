<?php

namespace App\Filament\Admin\Support;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Services\BinarySubtreeVolumeService;

/**
 * Admin “Check team” — left/right leg totals (same as member My Team + SQL).
 */
final class AdminTeamLegCheckHelper
{
    /**
     * @return array<string, mixed>|null
     */
    public static function build(string $lookup): ?array
    {
        $lookup = trim($lookup);
        if ($lookup === '') {
            return null;
        }

        $user = ctype_digit($lookup)
            ? User::query()->find((int) $lookup)
            : User::query()->where('login_uid', $lookup)->first();

        if ($user === null) {
            return null;
        }

        $volume = app(BinarySubtreeVolumeService::class);

        $scopes = [
            BinaryDailyClosing::SCOPE_ACTIVE_PANEL => 'Active panel',
            BinaryDailyClosing::SCOPE_PANEL => 'Sub panel',
            BinaryDailyClosing::SCOPE_SUPER => 'Super panel',
        ];

        $totals = [];
        foreach ($scopes as $scope => $label) {
            $life = $volume->lifetimeLegVolumes($user, $scope);
            $totals[$scope] = [
                'label' => $label,
                'left' => (int) $life['left'],
                'right' => (int) $life['right'],
            ];
        }

        return [
            'user' => [
                'id' => (int) $user->id,
                'login_uid' => (string) $user->login_uid,
                'name' => (string) $user->name,
                'sub_panel_count' => (int) $user->sub_panel_count,
                'super_sub_panel_count' => (int) $user->super_sub_panel_count,
                'active_panelist' => $user->qualifiesActivePanelistIncome(),
                'wallet_balance' => number_format((float) $user->wallet_balance, 2, '.', ''),
                'id_uid' => (int) $user->id.' / '.(string) $user->login_uid,
            ],
            'left_child_id' => $user->left_child_id,
            'right_child_id' => $user->right_child_id,
            'totals' => $totals,
            'members' => [
                'left' => self::legMemberBreakdown($user, 'left', $volume),
                'right' => self::legMemberBreakdown($user, 'right', $volume),
            ],
        ];
    }

    /**
     * @return array{
     *     active: list<array{id:int,login_uid:string,id_uid:string,name:string,count:int,wallet_balance:string}>,
     *     sub: list<array{id:int,login_uid:string,id_uid:string,name:string,count:int,wallet_balance:string}>,
     *     super: list<array{id:int,login_uid:string,id_uid:string,name:string,count:int,wallet_balance:string}>
     * }
     */
    private static function legMemberBreakdown(User $root, string $leg, BinarySubtreeVolumeService $volume): array
    {
        $startId = strtolower($leg) === 'left' ? $root->left_child_id : $root->right_child_id;
        $ids = $volume->collectBinarySubtreeIds($startId !== null ? (int) $startId : null);

        if ($ids === []) {
            return ['active' => [], 'sub' => [], 'super' => []];
        }

        $users = User::query()
            ->whereIn('id', $ids)
            ->get(['id', 'login_uid', 'name', 'sub_panel_count', 'super_sub_panel_count', 'wallet_balance', 'activation_fee_paid_at', 'minimum_panel_fee_paid_at', 'email']);

        $active = [];
        $sub = [];
        $super = [];

        foreach ($users as $u) {
            if ($u->isDummy()) {
                continue;
            }

            if ($u->qualifiesActivePanelistIncome()) {
                $active[] = self::memberRow($u, 1);
            }

            if ((int) $u->sub_panel_count > 0) {
                $sub[] = self::memberRow($u, (int) $u->sub_panel_count);
            }

            if ((int) $u->super_sub_panel_count > 0) {
                $super[] = self::memberRow($u, (int) $u->super_sub_panel_count);
            }
        }

        self::sortRowsByWalletDesc($active);
        self::sortRowsByWalletDesc($sub);
        self::sortRowsByWalletDesc($super);

        return ['active' => $active, 'sub' => $sub, 'super' => $super];
    }

    /**
     * @return array{id:int,login_uid:string,id_uid:string,name:string,count:int,wallet_balance:string}
     */
    private static function memberRow(User $u, int $count): array
    {
        return [
            'id' => (int) $u->id,
            'login_uid' => (string) $u->login_uid,
            'id_uid' => (int) $u->id.' / '.(string) $u->login_uid,
            'name' => (string) $u->name,
            'count' => $count,
            'wallet_balance' => number_format((float) $u->wallet_balance, 2, '.', ''),
        ];
    }

    /**
     * @param  list<array{wallet_balance:string}>  $rows
     */
    private static function sortRowsByWalletDesc(array &$rows): void
    {
        usort($rows, static fn (array $a, array $b): int => bccomp($b['wallet_balance'], $a['wallet_balance'], 2));
    }
}

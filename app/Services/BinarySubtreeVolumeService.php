<?php

namespace App\Services;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Support\BinaryClosingCalendar;
use App\Support\BinaryWeakSideLapse;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * Team leg volumes from binary subtrees (left child / right child).
 * Closing match = opening carry from lifetime leg totals + yesterday per leg.
 */
class BinarySubtreeVolumeService
{
    /**
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
     * @return array{left: int, right: int}
     */
    public function lifetimeLegVolumes(User $user, string $scope): array
    {
        return [
            'left' => $this->legVolume($user, 'left', $scope, false),
            'right' => $this->legVolume($user, 'right', $scope, false),
        ];
    }

    /**
     * @return array{left: int, right: int}
     */
    public function yesterdayLegVolumes(User $user, string $scope, ?CarbonInterface $date = null): array
    {
        return [
            'left' => $this->legVolume($user, 'left', $scope, true, $date),
            'right' => $this->legVolume($user, 'right', $scope, true, $date),
        ];
    }

    /**
     * @return array{
     *     left_in: int,
     *     right_in: int,
     *     opening_left_out: int,
     *     opening_right_out: int,
     *     yesterday_left: int,
     *     yesterday_right: int,
     *     total_left: int,
     *     total_right: int
     * }
     */
    public function closingMatchInputs(User $user, string $scope, ?CarbonInterface $date = null, ?int $maxPairs = null): array
    {
        $maxPairs ??= match ($scope) {
            BinaryDailyClosing::SCOPE_ACTIVE_PANEL => (int) config('binary_closing.scopes.active_panel.max_pairs_per_day', 20),
            BinaryDailyClosing::SCOPE_SUPER => (int) config('binary_closing.scopes.super.max_pairs_per_day', 20),
            default => (int) config('binary_closing.scopes.panel.max_pairs_per_day', 20),
        };

        $lifetime = $this->lifetimeLegVolumes($user, $scope);
        $yesterday = $this->yesterdayLegVolumes($user, $scope, $date);

        $opening = BinaryWeakSideLapse::splitFromLegCounts(
            $lifetime['left'],
            $lifetime['right'],
            $maxPairs,
        );

        $leftIn = (int) $opening['left_out'] + (int) $yesterday['left'];
        $rightIn = (int) $opening['right_out'] + (int) $yesterday['right'];

        return [
            'left_in' => $leftIn,
            'right_in' => $rightIn,
            'opening_left_out' => (int) $opening['left_out'],
            'opening_right_out' => (int) $opening['right_out'],
            'yesterday_left' => (int) $yesterday['left'],
            'yesterday_right' => (int) $yesterday['right'],
            'total_left' => $lifetime['left'],
            'total_right' => $lifetime['right'],
        ];
    }

    private function legVolume(User $user, string $leg, string $scope, bool $yesterdayOnly, ?CarbonInterface $date = null): int
    {
        $leg = strtolower($leg);
        $startId = $leg === 'left' ? $user->left_child_id : $user->right_child_id;
        $ids = $this->collectBinarySubtreeIds($startId !== null ? (int) $startId : null);
        if ($ids === []) {
            return 0;
        }

        if ($yesterdayOnly) {
            $dateStr = $date !== null
                ? CarbonImmutable::instance($date)->setTimezone(BinaryClosingCalendar::timezone())->toDateString()
                : BinaryClosingCalendar::yesterdayDateString();
            [$start, $end] = BinaryClosingCalendar::dateLocalBounds($dateStr);

            return match ($scope) {
                BinaryDailyClosing::SCOPE_ACTIVE_PANEL => User::query()
                    ->whereIn('id', $ids)
                    ->whereBetween('minimum_panel_fee_paid_at', [$start, $end])
                    ->count(),
                BinaryDailyClosing::SCOPE_SUPER => (int) WalletTransaction::query()
                    ->whereIn('user_id', $ids)
                    ->where('type', WalletTransaction::TYPE_SUPER_SUB_PANEL_FEE)
                    ->whereBetween('created_at', [$start, $end])
                    ->count(),
                default => (int) WalletTransaction::query()
                    ->whereIn('user_id', $ids)
                    ->where('type', WalletTransaction::TYPE_SUB_PANEL_FEE)
                    ->whereBetween('created_at', [$start, $end])
                    ->count(),
            };
        }

        if ($scope === BinaryDailyClosing::SCOPE_ACTIVE_PANEL) {
            return User::query()
                ->whereIn('id', $ids)
                ->get(['minimum_panel_fee_paid_at', 'activation_fee_paid_at'])
                ->filter(fn (User $u) => $u->qualifiesActivePanelistIncome())
                ->count();
        }

        $column = $scope === BinaryDailyClosing::SCOPE_SUPER ? 'super_sub_panel_count' : 'sub_panel_count';

        return (int) User::query()->whereIn('id', $ids)->sum($column);
    }
}

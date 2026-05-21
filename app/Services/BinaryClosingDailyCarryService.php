<?php

namespace App\Services;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Support\BinaryClosingCalendar;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * Closing-date carry: only points that accrued on the calendar `closing_date`
 * (from wallet purchase events), not the full cumulative user carry bucket.
 */
class BinaryClosingDailyCarryService
{
    private const MAX_UPLINE_WALK = 100000;

    /**
     * Per ancestor user id → left/right increments on this closing_date only.
     *
     * @return array<int, array{left: int, right: int}>
     */
    public function incrementsForClosingDate(string $scope, CarbonInterface $closingDate): array
    {
        $date = CarbonImmutable::instance($closingDate)
            ->setTimezone(BinaryClosingCalendar::timezone())
            ->startOfDay();

        [$start, $end] = BinaryClosingCalendar::dateLocalBounds($date->toDateString());

        $buyerIds = WalletTransaction::query()
            ->where('type', $this->purchaseTxType($scope))
            ->whereBetween('created_at', [$start, $end])
            ->orderBy('id')
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($buyerIds === []) {
            return [];
        }

        $expected = [];

        $buyers = User::query()
            ->whereIn('id', array_values(array_unique($buyerIds)))
            ->whereNotNull('binary_parent_id')
            ->select(['id', 'binary_parent_id', 'binary_side'])
            ->get()
            ->keyBy('id');

        foreach ($buyers as $buyer) {
            $this->walkUplineIncrements($expected, $buyer);
        }

        return $expected;
    }

    /**
     * @return array{left: int, right: int}
     */
    public function incrementsForUserOnClosingDate(int $userId, string $scope, CarbonInterface $closingDate): array
    {
        $all = $this->incrementsForClosingDate($scope, $closingDate);

        return $all[$userId] ?? ['left' => 0, 'right' => 0];
    }

    private function purchaseTxType(string $scope): string
    {
        return match ($scope) {
            BinaryDailyClosing::SCOPE_ACTIVE_PANEL => WalletTransaction::TYPE_MINIMUM_PANEL_FEE,
            BinaryDailyClosing::SCOPE_PANEL => WalletTransaction::TYPE_SUB_PANEL_FEE,
            BinaryDailyClosing::SCOPE_SUPER => WalletTransaction::TYPE_SUPER_SUB_PANEL_FEE,
            default => throw new \InvalidArgumentException("Unknown closing scope: {$scope}"),
        };
    }

    /**
     * @param  array<int, array{left: int, right: int}>  $expected
     */
    private function walkUplineIncrements(array &$expected, User $buyer): void
    {
        $childSide = strtolower((string) $buyer->binary_side);
        $parentId = (int) ($buyer->binary_parent_id ?? 0);

        for ($depth = 0; $depth < self::MAX_UPLINE_WALK; $depth++) {
            if ($parentId === 0 || ! in_array($childSide, ['left', 'right'], true)) {
                break;
            }

            $expected[$parentId] ??= ['left' => 0, 'right' => 0];
            $expected[$parentId][$childSide]++;

            $parent = User::query()
                ->whereKey($parentId)
                ->select(['id', 'binary_parent_id', 'binary_side'])
                ->first();

            if ($parent === null) {
                break;
            }

            $childSide = strtolower((string) $parent->binary_side);
            $parentId = (int) ($parent->binary_parent_id ?? 0);
        }
    }
}

<?php

namespace App\Services;

use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;

class PanelMatchingService
{
    public function __construct(
        protected SubPanelMatchingService $subPanelMatching,
    ) {}

    /**
     * Call after a user successfully purchases another $10 sub panel (count already incremented).
     * Matching uses only direct binary legs: buyer's immediate binary upline gets left/right carry.
     * Each matched pair can pay (1) panel-matching 10% × $10 base (= $1 at defaults), up to 20 pairs/day, and
     * (2) sub-panel tabular milestone income, up to $256/day.
     */
    public function processSubPanelPurchase(User $buyer): void
    {
        $parentId = $buyer->binary_parent_id;
        if ($parentId === null) {
            return;
        }

        $side = strtolower((string) $buyer->binary_side);
        if (! in_array($side, ['left', 'right'], true)) {
            return;
        }

        DB::transaction(function () use ($parentId, $side) {
            /** @var User $earner */
            $earner = User::whereKey($parentId)->lockForUpdate()->firstOrFail();

            if ($side === 'left') {
                $earner->panel_match_carry_left = (int) $earner->panel_match_carry_left + 1;
            } else {
                $earner->panel_match_carry_right = (int) $earner->panel_match_carry_right + 1;
            }

            $earner->save();

            // When the daily closing system is the source-of-truth for panel matching,
            // we MUST NOT consume pairs in real-time — otherwise the midnight closing
            // would only see one-sided leftovers. Carry just accumulates here and the
            // `binary:daily-closing` cron does the matching + wallet credit at 12:00 AM IST.
            if ($this->isDailyClosingActive()) {
                return;
            }

            $left = (int) $earner->panel_match_carry_left;
            $right = (int) $earner->panel_match_carry_right;

            $pairVolume = (string) config('panel_matching.pair_volume_usd');
            $rate = (string) config('panel_matching.rate');
            $perPair = bcmul($pairVolume, $rate, 2);

            $maxPanelPairsPerDay = (int) config('panel_matching.max_pairs_per_day');
            $usedPanelBase = $this->matchingPairsUsedToday($earner->id);
            $panelPairsAdded = 0;
            $panelBatchTotal = '0.00';

            while (true) {
                $avail = min($left, $right);
                if ($avail <= 0) {
                    break;
                }

                $remainingPanelSlots = max(0, $maxPanelPairsPerDay - $usedPanelBase - $panelPairsAdded);
                $eligiblePanel = $earner->qualifiesForPanelMatchingIncome();
                $canPanel = $eligiblePanel && $remainingPanelSlots > 0;

                $earnedSub = $this->subPanelMatching->earnedToday($earner->id);
                $capSub = (string) config('sub_panel_matching.daily_cap_usd');
                $eligibleSub = $earner->qualifiesForPanelMatchingIncome();
                $canSub = $eligibleSub && bccomp($earnedSub, $capSub, 2) < 0;

                if (! $canPanel && ! $canSub) {
                    break;
                }

                $left--;
                $right--;

                if ($canPanel) {
                    $panelPairsAdded++;
                    $panelBatchTotal = bcadd($panelBatchTotal, $perPair, 2);
                }

                if ($canSub) {
                    // Tier-based milestone counter is advanced by 1 pair; the
                    // payout fires only when the highest milestone is reached.
                    $this->subPanelMatching->applyMatchedPairs($earner, 1);
                }

                $earner->panel_match_carry_left = $left;
                $earner->panel_match_carry_right = $right;
                $earner->save();
            }

            if ($panelPairsAdded > 0 && bccomp($panelBatchTotal, '0.00', 2) > 0) {
                $newBalance = bcadd((string) $earner->wallet_balance, $panelBatchTotal, 2);
                $earner->wallet_balance = $newBalance;
                $earner->save();

                WalletTransaction::create([
                    'user_id' => $earner->id,
                    'type' => WalletTransaction::TYPE_PANEL_MATCHING,
                    'amount' => $panelBatchTotal,
                    'balance_after' => $newBalance,
                    'meta' => [
                        'pairs' => $panelPairsAdded,
                        'per_pair_usd' => $perPair,
                        'pair_volume_usd' => $pairVolume,
                        'rate' => $rate,
                    ],
                ]);
            }
        });
    }

    /**
     * True when the binary daily-closing system owns the panel scope.
     * In that case the real-time matching loop is bypassed (see processSubPanelPurchase).
     */
    public function isDailyClosingActive(): bool
    {
        if (! (bool) config('binary_closing.enabled', false)) {
            return false;
        }

        return (bool) config('binary_closing.scopes.panel.enabled', false);
    }

    public function matchingPairsUsedToday(int $userId): int
    {
        $sum = WalletTransaction::query()
            ->where('user_id', $userId)
            ->where('type', WalletTransaction::TYPE_PANEL_MATCHING)
            ->whereDate('created_at', now()->toDateString())
            ->get()
            ->sum(fn (WalletTransaction $t) => (int) ($t->meta['pairs'] ?? 0));

        return (int) $sum;
    }

    /**
     * Lifetime sub-panel purchases across the earner's full left/right binary legs.
     *
     * @return array{left:int,right:int}
     */
    public function lifetimeSubPanelBuys(User $earner): array
    {
        return [
            'left' => $this->sumSubPanelsInSubtree($earner->left_child_id),
            'right' => $this->sumSubPanelsInSubtree($earner->right_child_id),
        ];
    }

    private function sumSubPanelsInSubtree(?int $rootId): int
    {
        if ($rootId === null) {
            return 0;
        }

        $total = 0;
        $frontier = [$rootId];

        while ($frontier !== []) {
            $nodes = User::query()
                ->whereIn('id', $frontier)
                ->get(['id', 'left_child_id', 'right_child_id', 'sub_panel_count']);

            $frontier = [];
            foreach ($nodes as $node) {
                $total += (int) $node->sub_panel_count;

                if ($node->left_child_id !== null) {
                    $frontier[] = (int) $node->left_child_id;
                }
                if ($node->right_child_id !== null) {
                    $frontier[] = (int) $node->right_child_id;
                }
            }
        }

        return $total;
    }

    public function status(User $earner): array
    {
        $max = (int) config('panel_matching.max_pairs_per_day');
        $used = $this->matchingPairsUsedToday($earner->id);
        $pairVolume = (string) config('panel_matching.pair_volume_usd');
        $rate = (string) config('panel_matching.rate');
        $perPair = bcmul($pairVolume, $rate, 2);
        $carryL = (int) $earner->panel_match_carry_left;
        $carryR = (int) $earner->panel_match_carry_right;
        $pairsAvailable = min($carryL, $carryR);
        $slotsLeftToday = max(0, $max - $used);
        $lifetime = $this->lifetimeSubPanelBuys($earner);

        return [
            'eligible' => $earner->qualifiesForPanelMatchingIncome(),
            'carry_left' => $carryL,
            'carry_right' => $carryR,
            /** Lifetime cumulative left/right sub-panel buys under this earner (live). */
            'total_left_subs' => $lifetime['left'],
            'total_right_subs' => $lifetime['right'],
            'pairs_available' => $pairsAvailable,
            'pairs_paid_today' => $used,
            'pairs_remaining_today' => $slotsLeftToday,
            /** How many more pairs can pay today: min(1:1 carry, daily cap slots left). */
            'pairs_payable_today' => min($pairsAvailable, $slotsLeftToday),
            'max_pairs_per_day' => $max,
            'rate' => $rate,
            'pair_volume_usd' => $pairVolume,
            'per_pair_income_usd' => $perPair,
        ];
    }
}

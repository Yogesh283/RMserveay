<?php

namespace App\Console\Commands;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Backfill panel_match_carry_{left,right}      (scope=panel  → sub-panel matching)
 * and    super_panel_match_carry_{left,right}  (scope=super  → super-sub matching)
 * for every binary ancestor in the live tree.
 *
 * Why this exists:
 *   The original PanelMatchingService::processSubPanelPurchase /
 *   SuperSubPanelMatchingService::processSuperSubPanelPurchase used to credit only
 *   the immediate binary parent. As a result, deep upline ancestors had carries
 *   stuck at 0 even though their leg had many sub/super panel buys. The runtime
 *   bug is fixed (full upline walk) — this command repairs the historical data.
 *
 * Idempotency:
 *   1) Wipes existing carries for the chosen scope.
 *   2) Walks every {sub|super}_panel_users row's full binary upline chain,
 *      summing per-leg.
 *   3) Subtracts pairs already paid out in past closings (so repeat runs never
 *      double-credit historical payouts).
 *
 * Usage:
 *   php artisan binary:backfill-panel-carries --scope=panel --dry
 *   php artisan binary:backfill-panel-carries --scope=panel
 *   php artisan binary:backfill-panel-carries --scope=super
 *   php artisan binary:backfill-panel-carries --scope=all
 */
class BackfillSubSuperPanelCarriesCommand extends Command
{
    protected $signature = 'binary:backfill-panel-carries
        {--scope=all : panel | super | all}
        {--dry : Show what would change without writing.}';

    protected $description = 'Recompute panel_match_carry_* and super_panel_match_carry_* from the live binary tree (uses sub_panel_count / super_sub_panel_count as source of truth).';

    public function handle(): int
    {
        $scope = strtolower((string) $this->option('scope'));
        if (! in_array($scope, ['panel', 'super', 'all'], true)) {
            $this->error("Invalid --scope. Use: panel | super | all");

            return self::INVALID;
        }

        $dry = (bool) $this->option('dry');

        $exit = self::SUCCESS;
        if ($scope === 'panel' || $scope === 'all') {
            $exit = max($exit, $this->backfillScope(
                'panel',
                'panel_match_carry_left',
                'panel_match_carry_right',
                'sub_panel_count',
                BinaryDailyClosing::SCOPE_PANEL,
                $dry,
            ));
        }
        if ($scope === 'super' || $scope === 'all') {
            $exit = max($exit, $this->backfillScope(
                'super',
                'super_panel_match_carry_left',
                'super_panel_match_carry_right',
                'super_sub_panel_count',
                BinaryDailyClosing::SCOPE_SUPER,
                $dry,
            ));
        }

        return $exit;
    }

    private function backfillScope(
        string $label,
        string $leftCol,
        string $rightCol,
        string $countCol,
        string $closingScope,
        bool $dry,
    ): int {
        $this->newLine();
        $this->info("=== Backfill {$label} ({$leftCol} / {$rightCol}) ===");

        // Every user that owns at least one of the relevant panel type — this is
        // the full set of "buyers" whose upline gets +1 carry per panel they own.
        $buyers = User::query()
            ->where($countCol, '>', 0)
            ->whereNotNull('binary_parent_id')
            ->select(['id', 'binary_parent_id', 'binary_side', $countCol])
            ->get();

        $this->line(sprintf(
            'mode=%s buyers=%d',
            $dry ? 'DRY-RUN' : 'APPLY',
            $buyers->count(),
        ));

        if ($buyers->isEmpty()) {
            $this->warn("No users with {$countCol} > 0 — nothing to backfill.");

            return self::SUCCESS;
        }

        // ancestor_id => ['left' => int, 'right' => int]
        $expected = [];

        foreach ($buyers as $u) {
            $count = (int) $u->{$countCol};
            $childSide = strtolower((string) $u->binary_side);
            $parentId = (int) ($u->binary_parent_id ?? 0);

            for ($depth = 0; $depth < 100000; $depth++) {
                if ($parentId === 0 || ! in_array($childSide, ['left', 'right'], true)) {
                    break;
                }
                $expected[$parentId] ??= ['left' => 0, 'right' => 0];
                $expected[$parentId][$childSide] += $count;

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

        $this->line(sprintf('Computed expected carries for %d ancestors.', count($expected)));

        // Subtract pairs already paid by past closings of this scope so we never
        // re-credit historical payouts. Each matched pair consumed 1 left + 1 right.
        $paidByAncestor = BinaryDailyClosing::query()
            ->where('scope', $closingScope)
            ->whereIn('user_id', array_keys($expected))
            ->selectRaw('user_id, COALESCE(SUM(pairs_matched),0) AS pairs')
            ->groupBy('user_id')
            ->pluck('pairs', 'user_id');

        foreach ($expected as $ancestorId => &$sides) {
            $alreadyPaid = (int) ($paidByAncestor[$ancestorId] ?? 0);
            if ($alreadyPaid <= 0) {
                continue;
            }
            $sides['left'] = max(0, $sides['left'] - $alreadyPaid);
            $sides['right'] = max(0, $sides['right'] - $alreadyPaid);
        }
        unset($sides);

        // Diff against current values.
        $current = User::query()
            ->whereIn('id', array_keys($expected))
            ->orWhere($leftCol, '>', 0)
            ->orWhere($rightCol, '>', 0)
            ->select(['id', $leftCol, $rightCol])
            ->get()
            ->keyBy('id');

        $diffRows = [];
        $allIds = array_unique(array_merge(array_keys($expected), $current->keys()->all()));
        sort($allIds);
        foreach ($allIds as $id) {
            $eL = (int) ($expected[$id]['left'] ?? 0);
            $eR = (int) ($expected[$id]['right'] ?? 0);
            $cL = (int) ($current[$id]->{$leftCol} ?? 0);
            $cR = (int) ($current[$id]->{$rightCol} ?? 0);
            if ($eL !== $cL || $eR !== $cR) {
                $diffRows[] = [
                    'user_id' => $id,
                    'before_L' => $cL,
                    'before_R' => $cR,
                    'after_L' => $eL,
                    'after_R' => $eR,
                ];
            }
        }

        if ($diffRows === []) {
            $this->info("No differences — {$label} carries already in sync with the binary tree.");

            return self::SUCCESS;
        }

        $this->table(
            ['User', 'L (before)', 'R (before)', 'L (after)', 'R (after)'],
            collect($diffRows)->take(30)->map(fn ($r) => [
                $r['user_id'],
                $r['before_L'],
                $r['before_R'],
                $r['after_L'],
                $r['after_R'],
            ])->all(),
        );

        if (count($diffRows) > 30) {
            $this->line(sprintf('  …and %d more rows.', count($diffRows) - 30));
        }

        if ($dry) {
            $this->warn('Dry-run only — no changes written. Re-run without --dry to apply.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($expected, $leftCol, $rightCol) {
            User::query()
                ->where($leftCol, '>', 0)
                ->orWhere($rightCol, '>', 0)
                ->update([
                    $leftCol => 0,
                    $rightCol => 0,
                ]);

            foreach ($expected as $ancestorId => $sides) {
                User::query()
                    ->whereKey($ancestorId)
                    ->update([
                        $leftCol => (int) $sides['left'],
                        $rightCol => (int) $sides['right'],
                    ]);
            }
        });

        $this->info(sprintf('Updated %d %s ancestor carries.', count($diffRows), $label));

        return self::SUCCESS;
    }
}

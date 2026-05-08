<?php

namespace App\Console\Commands;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Backfill active_panel_match_carry_left / right for users whose downline had
 * already paid minimum_panel_fee BEFORE the active-panel matching hook was
 * deployed. Walks every active panelist's full binary upline chain and adds
 * +1 carry to the leg they fall under (relative to each ancestor).
 *
 * Idempotency: the command first ZEROES out all existing active_panel_*
 * carries (so re-running cannot double-count), then recomputes from scratch
 * using the live binary tree + minimum_panel_fee_paid_at flag.
 *
 * Usage:
 *   php artisan binary:backfill-active-panel-carries --dry
 *   php artisan binary:backfill-active-panel-carries           # apply
 */
class BackfillActivePanelCarriesCommand extends Command
{
    protected $signature = 'binary:backfill-active-panel-carries
        {--dry : Show what would change without writing to the database.}';

    protected $description = 'Recompute active_panel_match_carry_{left,right} from the live binary tree (uses minimum_panel_fee_paid_at as the source of truth).';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry');

        $activePanelists = User::query()
            ->whereNotNull('minimum_panel_fee_paid_at')
            ->whereNotNull('binary_parent_id')
            ->select(['id', 'binary_parent_id', 'binary_side'])
            ->get();

        $this->line(sprintf(
            '<info>Backfilling active-panel carries</info> mode=%s panelists=%d',
            $dry ? 'DRY-RUN' : 'APPLY',
            $activePanelists->count(),
        ));

        if ($activePanelists->isEmpty()) {
            $this->warn('No users have minimum_panel_fee_paid_at set — nothing to backfill.');

            return self::SUCCESS;
        }

        // ancestor_id => ['left' => int, 'right' => int]
        $expected = [];

        foreach ($activePanelists as $u) {
            $childId = (int) $u->id;
            $childSide = strtolower((string) $u->binary_side);
            $parentId = (int) ($u->binary_parent_id ?? 0);

            // Defensive cap mirroring ActivePanelMatchingService::MAX_UPLINE_WALK.
            for ($depth = 0; $depth < 100000; $depth++) {
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
                $childId = (int) $parent->id;
                $childSide = strtolower((string) $parent->binary_side);
                $parentId = (int) ($parent->binary_parent_id ?? 0);
            }
        }

        $this->line(sprintf('<info>Computed expected carries for %d ancestors.</info>', count($expected)));

        // Subtract pairs ALREADY paid by past active_panel closings so the
        // backfill never re-credits historical payouts. Each matched pair
        // consumed 1 left + 1 right, so we subtract `pairs_matched` from BOTH
        // legs (clamped at 0).
        $paidByAncestor = BinaryDailyClosing::query()
            ->where('scope', BinaryDailyClosing::SCOPE_ACTIVE_PANEL)
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

        // Diff against current values for the first 20 rows so the operator
        // can sanity-check before applying.
        $current = User::query()
            ->whereIn('id', array_keys($expected))
            ->orWhere('active_panel_match_carry_left', '>', 0)
            ->orWhere('active_panel_match_carry_right', '>', 0)
            ->select(['id', 'active_panel_match_carry_left', 'active_panel_match_carry_right'])
            ->get()
            ->keyBy('id');

        $diffRows = [];
        $allIds = array_unique(array_merge(array_keys($expected), $current->keys()->all()));
        sort($allIds);
        foreach ($allIds as $id) {
            $eL = (int) ($expected[$id]['left'] ?? 0);
            $eR = (int) ($expected[$id]['right'] ?? 0);
            $cL = (int) ($current[$id]->active_panel_match_carry_left ?? 0);
            $cR = (int) ($current[$id]->active_panel_match_carry_right ?? 0);
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
            $this->info('No differences — carries already in sync with the binary tree.');

            return self::SUCCESS;
        }

        $this->table(
            ['User', 'Carry L (before)', 'Carry R (before)', 'Carry L (after)', 'Carry R (after)'],
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

        DB::transaction(function () use ($expected) {
            // Reset every existing carry first so re-running is safe.
            User::query()
                ->where('active_panel_match_carry_left', '>', 0)
                ->orWhere('active_panel_match_carry_right', '>', 0)
                ->update([
                    'active_panel_match_carry_left' => 0,
                    'active_panel_match_carry_right' => 0,
                ]);

            foreach ($expected as $ancestorId => $sides) {
                User::query()
                    ->whereKey($ancestorId)
                    ->update([
                        'active_panel_match_carry_left' => (int) $sides['left'],
                        'active_panel_match_carry_right' => (int) $sides['right'],
                    ]);
            }
        });

        $this->info(sprintf('Updated %d ancestor carries. Now run:', count($diffRows)));
        $this->line('  php artisan binary:daily-closing --scope=active_panel --date=today');

        return self::SUCCESS;
    }
}

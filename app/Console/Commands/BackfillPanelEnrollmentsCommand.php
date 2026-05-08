<?php

namespace App\Console\Commands;

use App\Models\ActivePanelUser;
use App\Models\SubPanelUser;
use App\Models\SuperSubPanelUser;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Populate the snapshot tables from the live `users` + `wallet_transactions`
 * data. Safe to re-run — every row is upserted (no duplicates / increments).
 *
 *   php artisan panels:backfill-enrollments --dry
 *   php artisan panels:backfill-enrollments
 */
class BackfillPanelEnrollmentsCommand extends Command
{
    protected $signature = 'panels:backfill-enrollments
        {--dry : Show what would change without writing to the database.}';

    protected $description = 'Backfill active_panel_users, sub_panel_users and super_sub_panel_users from the live users + wallet_transactions data.';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry');
        $activationFee = (string) config('self_survey.activation_fee', '1');
        $minPanelFee = (string) config('self_survey.minimum_panel_fee', '10');
        $activeTotal = bcadd($activationFee, $minPanelFee, 2);
        $subFee = (string) config('self_survey.sub_panel_entry_fee', '10');
        $superFee = (string) config('self_survey.super_sub_panel_entry_fee', '100');

        $this->line(sprintf('<info>Backfilling panel-enrollment snapshots</info> mode=%s', $dry ? 'DRY-RUN' : 'APPLY'));

        // -------- active_panel_users --------
        $activeUsers = User::query()
            ->whereNotNull('minimum_panel_fee_paid_at')
            ->select(['id', 'minimum_panel_fee_paid_at'])
            ->get();
        $this->line(sprintf('  active panelists: %d', $activeUsers->count()));

        // -------- sub_panel_users --------
        $subUsers = User::query()
            ->where('sub_panel_count', '>', 0)
            ->select(['id', 'sub_panel_count'])
            ->get();
        $this->line(sprintf('  sub panelists:    %d', $subUsers->count()));

        // -------- super_sub_panel_users --------
        $superUsers = User::query()
            ->where('super_sub_panel_count', '>', 0)
            ->select(['id', 'super_sub_panel_count'])
            ->get();
        $this->line(sprintf('  super panelists:  %d', $superUsers->count()));

        if ($dry) {
            $this->warn('Dry-run only — no changes written. Re-run without --dry to apply.');

            return self::SUCCESS;
        }

        $now = Carbon::now();

        DB::transaction(function () use ($activeUsers, $subUsers, $superUsers, $activeTotal, $subFee, $superFee, $now) {
            foreach ($activeUsers as $u) {
                ActivePanelUser::updateOrCreate(
                    ['user_id' => $u->id],
                    [
                        'activated_at' => $u->minimum_panel_fee_paid_at ?? $now,
                        'total_paid_usd' => $activeTotal,
                    ],
                );
            }

            foreach ($subUsers as $u) {
                $bounds = $this->purchaseBounds((int) $u->id, WalletTransaction::TYPE_SUB_PANEL_FEE);
                $count = (int) $u->sub_panel_count;
                SubPanelUser::updateOrCreate(
                    ['user_id' => $u->id],
                    [
                        'panels_count' => $count,
                        'first_purchased_at' => $bounds['first'] ?? $now,
                        'last_purchased_at' => $bounds['last'] ?? $now,
                        'total_paid_usd' => bcmul((string) $count, $subFee, 2),
                    ],
                );
            }

            foreach ($superUsers as $u) {
                $bounds = $this->purchaseBounds((int) $u->id, WalletTransaction::TYPE_SUPER_SUB_PANEL_FEE);
                $count = (int) $u->super_sub_panel_count;
                SuperSubPanelUser::updateOrCreate(
                    ['user_id' => $u->id],
                    [
                        'panels_count' => $count,
                        'first_purchased_at' => $bounds['first'] ?? $now,
                        'last_purchased_at' => $bounds['last'] ?? $now,
                        'total_paid_usd' => bcmul((string) $count, $superFee, 2),
                    ],
                );
            }
        });

        $this->info(sprintf(
            'Backfilled active=%d sub=%d super=%d.',
            $activeUsers->count(),
            $subUsers->count(),
            $superUsers->count(),
        ));

        return self::SUCCESS;
    }

    /**
     * @return array{first:?Carbon,last:?Carbon}
     */
    private function purchaseBounds(int $userId, string $type): array
    {
        $row = WalletTransaction::query()
            ->where('user_id', $userId)
            ->where('type', $type)
            ->selectRaw('MIN(created_at) AS first_at, MAX(created_at) AS last_at')
            ->first();

        return [
            'first' => $row?->first_at ? Carbon::parse($row->first_at) : null,
            'last' => $row?->last_at ? Carbon::parse($row->last_at) : null,
        ];
    }
}

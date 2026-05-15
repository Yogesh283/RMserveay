<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Production DBs created before 2026_05_08_240000 may lack panels_count /
 * purchase timestamps on sub/super snapshot tables.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->ensurePanelSnapshotColumns('sub_panel_users');
        $this->ensurePanelSnapshotColumns('super_sub_panel_users');
    }

    public function down(): void
    {
        // Non-destructive upgrade only — do not drop columns on rollback in production.
    }

    private function ensurePanelSnapshotColumns(string $table): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($table): void {
            if (! Schema::hasColumn($table, 'panels_count')) {
                $blueprint->unsignedInteger('panels_count')->default(0);
            }

            if (! Schema::hasColumn($table, 'first_purchased_at')) {
                $blueprint->timestamp('first_purchased_at')->nullable();
            }

            if (! Schema::hasColumn($table, 'last_purchased_at')) {
                $blueprint->timestamp('last_purchased_at')->nullable();
            }

            if (! Schema::hasColumn($table, 'total_paid_usd')) {
                $blueprint->decimal('total_paid_usd', 18, 2)->default('0.00');
            }
        });
    }
};

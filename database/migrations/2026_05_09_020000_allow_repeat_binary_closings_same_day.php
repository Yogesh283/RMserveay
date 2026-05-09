<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Testing mode requirement: allow binary closing to be run multiple times for
 * the same user + scope + date.
 *
 * The original unique indexes made `--date=today` idempotent for production,
 * but testing needs repeated same-day runs after adding new carry or restoring
 * carry manually. We keep non-unique lookup indexes for reports.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Add the replacement non-unique indexes BEFORE dropping the unique
        // ones — otherwise MySQL refuses to drop the existing index because
        // it is still required as the covering index for the user_id FK.
        Schema::table('binary_daily_closings', function (Blueprint $table) {
            $table->index(['user_id', 'closing_date', 'scope'], 'binary_closings_user_date_scope_idx');
        });
        Schema::table('binary_daily_closings', function (Blueprint $table) {
            $table->dropUnique('binary_closings_user_date_scope_unique');
        });

        Schema::table('matching_payouts', function (Blueprint $table) {
            $table->index(['user_id', 'scope', 'closing_date'], 'matching_payouts_user_scope_date_idx');
        });
        Schema::table('matching_payouts', function (Blueprint $table) {
            $table->dropUnique('matching_payouts_user_scope_date_unique');
        });
    }

    public function down(): void
    {
        Schema::table('matching_payouts', function (Blueprint $table) {
            $table->unique(['user_id', 'scope', 'closing_date'], 'matching_payouts_user_scope_date_unique');
        });
        Schema::table('matching_payouts', function (Blueprint $table) {
            $table->dropIndex('matching_payouts_user_scope_date_idx');
        });

        Schema::table('binary_daily_closings', function (Blueprint $table) {
            $table->unique(['user_id', 'closing_date', 'scope'], 'binary_closings_user_date_scope_unique');
        });
        Schema::table('binary_daily_closings', function (Blueprint $table) {
            $table->dropIndex('binary_closings_user_date_scope_idx');
        });
    }
};

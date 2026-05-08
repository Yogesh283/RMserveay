<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Snapshot tables (1 row per user) for panel enrollment state. Maintained
 * alongside the existing users.* counter fields and wallet_transactions.
 *
 *  - active_panel_users:    one row when a user pays the $10 minimum-panel-fee.
 *  - sub_panel_users:       one row per user with sub_panel_count > 0.
 *  - super_sub_panel_users: one row per user with super_sub_panel_count > 0.
 *
 * The per-event ledger remains in wallet_transactions; these tables answer
 * "which users are active panelists / sub panelists / super panelists right
 * now" without scanning the wallet log.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('active_panel_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->timestamp('activated_at');
            $table->decimal('total_paid_usd', 18, 2)->default('0.00');
            $table->timestamps();

            $table->index('activated_at');
        });

        Schema::create('sub_panel_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('panels_count')->default(0);
            $table->timestamp('first_purchased_at')->nullable();
            $table->timestamp('last_purchased_at')->nullable();
            $table->decimal('total_paid_usd', 18, 2)->default('0.00');
            $table->timestamps();

            $table->index('panels_count');
            $table->index('last_purchased_at');
        });

        Schema::create('super_sub_panel_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('panels_count')->default(0);
            $table->timestamp('first_purchased_at')->nullable();
            $table->timestamp('last_purchased_at')->nullable();
            $table->decimal('total_paid_usd', 18, 2)->default('0.00');
            $table->timestamps();

            $table->index('panels_count');
            $table->index('last_purchased_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('super_sub_panel_users');
        Schema::dropIfExists('sub_panel_users');
        Schema::dropIfExists('active_panel_users');
    }
};

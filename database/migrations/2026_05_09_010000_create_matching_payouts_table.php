<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Paid users only" payout ledger.
 *
 * One row per (user, scope, closing_date) — but ONLY when payout > 0.
 * Users that closed with $0 (ineligible / no milestone reached) are
 * intentionally NOT recorded here. This makes "who got paid today"
 * a single-table query without scanning binary_daily_closings or the
 * wallet_transactions log.
 *
 * The full audit (including $0 closings, lapses, carry-outs) still
 * lives in binary_daily_closings; the actual money movement still
 * lives in wallet_transactions. This table is a denormalised, fast
 * payout-only index of those two.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matching_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            /** Scope: 'active_panel' | 'panel' (sub) | 'super' (super-sub). */
            $table->string('scope', 16);
            $table->date('closing_date');

            $table->unsignedInteger('pairs_matched')->default(0);
            /** Only set for sub / super scopes (milestone tier hit). NULL for active. */
            $table->unsignedInteger('milestone')->nullable();
            $table->unsignedInteger('lapsed_pairs')->default(0);

            $table->decimal('payout_usd', 14, 2);
            $table->decimal('balance_after_usd', 16, 2)->nullable();

            /** Source links so we can drill back into the audit + ledger. */
            $table->foreignId('binary_daily_closing_id')->nullable()->constrained('binary_daily_closings')->nullOnDelete();
            $table->foreignId('wallet_transaction_id')->nullable()->constrained('wallet_transactions')->nullOnDelete();

            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'scope', 'closing_date'], 'matching_payouts_user_scope_date_unique');
            $table->index(['closing_date', 'scope']);
            $table->index(['user_id', 'closing_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matching_payouts');
    }
};

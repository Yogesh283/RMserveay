<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('binary_daily_closings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('closing_date');
            /** Which carry-bucket this closing was for: 'panel' (sub-panel) or 'super' (super-sub-panel). */
            $table->string('scope', 16);
            $table->unsignedInteger('left_carry_in')->default(0);
            $table->unsignedInteger('right_carry_in')->default(0);
            $table->unsignedInteger('pairs_matched')->default(0);
            $table->boolean('cap_hit')->default(false);
            $table->decimal('per_pair_usd', 12, 2)->default(0);
            $table->decimal('payout_usd', 14, 2)->default(0);
            $table->decimal('balance_after_usd', 16, 2)->default(0);
            $table->unsignedInteger('left_carry_out')->default(0);
            $table->unsignedInteger('right_carry_out')->default(0);
            $table->unsignedInteger('left_lapsed')->default(0);
            $table->unsignedInteger('right_lapsed')->default(0);
            /** Optional FK to the wallet transaction created at closing (null when nothing was paid). */
            $table->foreignId('wallet_transaction_id')->nullable()->constrained('wallet_transactions')->nullOnDelete();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'closing_date', 'scope'], 'binary_closings_user_date_scope_unique');
            $table->index(['closing_date', 'scope']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('binary_daily_closings');
    }
};

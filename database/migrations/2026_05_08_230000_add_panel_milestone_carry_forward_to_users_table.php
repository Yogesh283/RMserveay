<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sub-panel and super-sub-panel matching now uses a tier-based, carry-forward
 * payout: at each closing, the highest milestone (≤ accumulated pairs) is paid
 * once and the remainder carries forward to the next day's counter. These two
 * columns persist that counter between closings.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->unsignedInteger('spm_pair_carry_forward')->default(0)->after('spm_milestone_mask');
            $table->unsignedInteger('sspm_pair_carry_forward')->default(0)->after('sspm_milestone_mask');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['spm_pair_carry_forward', 'sspm_pair_carry_forward']);
        });
    }
};

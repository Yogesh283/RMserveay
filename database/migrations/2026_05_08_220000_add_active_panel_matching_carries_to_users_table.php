<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Active-panel binary matching carries (one bucket per leg) — fed when a downline
 * pays their $10 minimum panel fee (the second half of the $11 active-panel
 * activation flow). Consumed by `binary:daily-closing` under scope `active_panel`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->unsignedInteger('active_panel_match_carry_left')->default(0)->after('panel_match_carry_right');
            $table->unsignedInteger('active_panel_match_carry_right')->default(0)->after('active_panel_match_carry_left');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['active_panel_match_carry_left', 'active_panel_match_carry_right']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedSmallInteger('super_panel_match_carry_left')->default(0)->after('spm_milestone_mask');
            $table->unsignedSmallInteger('super_panel_match_carry_right')->default(0)->after('super_panel_match_carry_left');
            $table->date('sspm_match_day')->nullable()->after('super_panel_match_carry_right');
            $table->unsignedSmallInteger('sspm_cumulative_panels')->default(0)->after('sspm_match_day');
            $table->unsignedSmallInteger('sspm_milestone_mask')->default(0)->after('sspm_cumulative_panels');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'super_panel_match_carry_left',
                'super_panel_match_carry_right',
                'sspm_match_day',
                'sspm_cumulative_panels',
                'sspm_milestone_mask',
            ]);
        });
    }
};

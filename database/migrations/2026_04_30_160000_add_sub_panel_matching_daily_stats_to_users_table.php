<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->date('spm_match_day')->nullable()->after('panel_match_carry_right');
            $table->unsignedSmallInteger('spm_cumulative_panels')->default(0)->after('spm_match_day');
            $table->unsignedSmallInteger('spm_milestone_mask')->default(0)->after('spm_cumulative_panels');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['spm_match_day', 'spm_cumulative_panels', 'spm_milestone_mask']);
        });
    }
};

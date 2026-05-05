<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedSmallInteger('panel_match_carry_left')->default(0)->after('super_sub_panel_count');
            $table->unsignedSmallInteger('panel_match_carry_right')->default(0)->after('panel_match_carry_left');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['panel_match_carry_left', 'panel_match_carry_right']);
        });
    }
};

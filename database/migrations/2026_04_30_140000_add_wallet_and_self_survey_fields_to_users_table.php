<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('wallet_balance', 14, 2)->default(0)->after('right_child_id');
            $table->timestamp('activation_fee_paid_at')->nullable()->after('wallet_balance');
            $table->timestamp('minimum_panel_fee_paid_at')->nullable()->after('activation_fee_paid_at');
            $table->unsignedTinyInteger('sub_panel_count')->default(0)->after('minimum_panel_fee_paid_at');
            $table->unsignedTinyInteger('super_sub_panel_count')->default(0)->after('sub_panel_count');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'wallet_balance',
                'activation_fee_paid_at',
                'minimum_panel_fee_paid_at',
                'sub_panel_count',
                'super_sub_panel_count',
            ]);
        });
    }
};

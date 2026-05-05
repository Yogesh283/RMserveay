<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('usdt_bep20_withdrawal_address', 128)->nullable()->after('wallet_balance');
        });

        Schema::create('deposit_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->string('tx_hash', 128)->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deposit_notifications');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('usdt_bep20_withdrawal_address');
        });
    }
};

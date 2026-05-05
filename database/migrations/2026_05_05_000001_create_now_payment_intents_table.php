<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('now_payment_intents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('order_id', 64)->unique();
            $table->string('payment_id', 64)->nullable()->unique();
            $table->decimal('amount_usd', 14, 2);
            $table->string('pay_currency', 32)->nullable();
            $table->decimal('pay_amount', 24, 12)->nullable();
            $table->string('pay_address', 128)->nullable();
            $table->string('payment_status', 32)->default('waiting');
            $table->boolean('credited')->default(false);
            $table->string('payin_hash', 128)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('now_payment_intents');
    }
};

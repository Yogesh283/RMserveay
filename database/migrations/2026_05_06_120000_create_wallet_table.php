<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->decimal('wallet_balance', 14, 2)->default(0);
            $table->decimal('p2p_wallet_balance', 14, 2)->default(0);
            $table->timestamps();
        });

        User::query()->orderBy('id')->chunkById(500, function ($users) {
            $now = now();
            $rows = [];
            foreach ($users as $user) {
                $rows[] = [
                    'user_id' => $user->id,
                    'wallet_balance' => $user->wallet_balance,
                    'p2p_wallet_balance' => $user->p2p_wallet_balance,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            if ($rows !== []) {
                DB::table('wallet')->insert($rows);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet');
    }
};

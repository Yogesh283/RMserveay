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
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('survey_wallet_balance', 14, 2)->default(0)->after('p2p_wallet_balance');
        });

        Schema::table('wallet', function (Blueprint $table) {
            $table->decimal('survey_wallet_balance', 14, 2)->default(0)->after('p2p_wallet_balance');
        });

        User::query()->orderBy('id')->chunkById(500, function ($users): void {
            $now = now();
            foreach ($users as $user) {
                DB::table('wallet')->updateOrInsert(
                    ['user_id' => $user->id],
                    [
                        'wallet_balance' => $user->wallet_balance ?? 0,
                        'p2p_wallet_balance' => $user->p2p_wallet_balance ?? 0,
                        'survey_wallet_balance' => 0,
                        'updated_at' => $now,
                        'created_at' => $now,
                    ]
                );
            }
        });
    }

    public function down(): void
    {
        Schema::table('wallet', function (Blueprint $table) {
            $table->dropColumn('survey_wallet_balance');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('survey_wallet_balance');
        });
    }
};

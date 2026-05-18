<?php

use App\Models\User;
use App\Services\MainDepositBalanceService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('main_deposit_balance', 14, 2)->default(0)->after('survey_wallet_balance');
        });

        Schema::table('wallet', function (Blueprint $table) {
            $table->decimal('main_deposit_balance', 14, 2)->default(0)->after('survey_wallet_balance');
        });

        $service = app(MainDepositBalanceService::class);

        User::query()->orderBy('id')->chunkById(200, function ($users) use ($service): void {
            foreach ($users as $user) {
                $reserved = $service->computeFromLedger($user);
                $user->forceFill(['main_deposit_balance' => $reserved])->saveQuietly();
                $user->wallet()->updateOrCreate(
                    ['user_id' => $user->id],
                    ['main_deposit_balance' => $reserved]
                );
            }
        });
    }

    public function down(): void
    {
        Schema::table('wallet', function (Blueprint $table) {
            $table->dropColumn('main_deposit_balance');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('main_deposit_balance');
        });
    }
};

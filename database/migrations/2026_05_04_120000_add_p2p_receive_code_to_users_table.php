<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('p2p_receive_code', 24)->nullable()->unique()->after('referral_code');
        });

        foreach (User::query()->whereNull('p2p_receive_code')->orderBy('id')->cursor() as $user) {
            $user->p2p_receive_code = User::generateP2pReceiveCode();
            $user->saveQuietly();
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['p2p_receive_code']);
            $table->dropColumn('p2p_receive_code');
        });
    }
};

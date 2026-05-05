<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('login_uid', 32)->nullable()->unique()->after('email');
        });

        DB::table('users')->whereNull('login_uid')->orderBy('id')->chunkById(100, function ($rows): void {
            foreach ($rows as $row) {
                DB::table('users')->where('id', $row->id)->update([
                    'login_uid' => 'acct_'.$row->id,
                ]);
            }
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('login_uid', 32)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['login_uid']);
            $table->dropColumn('login_uid');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('user_type', 32)->default('normal')->after('password');
            $table->text('profile')->nullable()->after('user_type');
            $table->string('qualification')->nullable()->after('profile');
            $table->string('phone', 32)->nullable()->after('qualification');
            $table->string('referral_code', 32)->nullable()->unique()->after('phone');
            $table->foreignId('sponsor_id')->nullable()->after('referral_code')->constrained('users')->nullOnDelete();
            $table->foreignId('binary_parent_id')->nullable()->after('sponsor_id')->constrained('users')->nullOnDelete();
            $table->string('binary_side', 8)->nullable()->after('binary_parent_id');
            $table->foreignId('left_child_id')->nullable()->after('binary_side')->constrained('users')->nullOnDelete();
            $table->foreignId('right_child_id')->nullable()->after('left_child_id')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['sponsor_id']);
            $table->dropForeign(['binary_parent_id']);
            $table->dropForeign(['left_child_id']);
            $table->dropForeign(['right_child_id']);
            $table->dropColumn([
                'user_type',
                'profile',
                'qualification',
                'phone',
                'referral_code',
                'sponsor_id',
                'binary_parent_id',
                'binary_side',
                'left_child_id',
                'right_child_id',
            ]);
        });
    }
};

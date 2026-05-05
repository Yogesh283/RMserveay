<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('survey_responses', function (Blueprint $table) {
            $table->decimal('respondent_reward_usd', 14, 2)->nullable()->after('completion_time_sec');
            $table->timestamp('respondent_payout_at')->nullable()->after('respondent_reward_usd');
            $table->unsignedBigInteger('respondent_payout_wallet_tx_id')->nullable()->after('respondent_payout_at');
            $table->index(['respondent_payout_at', 'respondent_payout_wallet_tx_id'], 'survey_responses_payout_due_idx');
        });
    }

    public function down(): void
    {
        Schema::table('survey_responses', function (Blueprint $table) {
            $table->dropIndex('survey_responses_payout_due_idx');
            $table->dropColumn(['respondent_reward_usd', 'respondent_payout_at', 'respondent_payout_wallet_tx_id']);
        });
    }
};

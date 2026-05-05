<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('survey_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('survey_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->comment('publisher');
            $table->json('answers');
            $table->json('respondent')->nullable();
            $table->boolean('completed')->default(true);
            $table->string('drop_off_question_key')->nullable();
            $table->unsignedInteger('completion_time_sec')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['survey_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('survey_responses');
    }
};

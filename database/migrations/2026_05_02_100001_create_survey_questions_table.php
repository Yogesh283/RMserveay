<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('survey_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('survey_id')->constrained()->cascadeOnDelete();
            $table->string('question_key');
            $table->string('type');
            $table->string('label');
            $table->text('description')->nullable();
            $table->boolean('required')->default(false);
            $table->json('options')->nullable();
            $table->unsignedTinyInteger('min_rating')->nullable();
            $table->unsignedTinyInteger('max_rating')->nullable();
            $table->json('logic')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['survey_id', 'question_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('survey_questions');
    }
};

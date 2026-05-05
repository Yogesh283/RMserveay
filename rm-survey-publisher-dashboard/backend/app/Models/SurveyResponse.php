<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SurveyResponse extends Model
{
    protected $fillable = [
        'survey_id',
        'user_id',
        'answers',
        'respondent',
        'completed',
        'drop_off_question_key',
        'completion_time_sec',
    ];

    protected function casts(): array
    {
        return [
            'answers' => 'array',
            'respondent' => 'array',
            'completed' => 'boolean',
            'completion_time_sec' => 'integer',
        ];
    }

    public function survey(): BelongsTo
    {
        return $this->belongsTo(Survey::class);
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function earning(): HasOne
    {
        return $this->hasOne(Earning::class);
    }
}

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
        'respondent_user_id',
        'answers',
        'respondent',
        'completed',
        'drop_off_question_key',
        'completion_time_sec',
        'respondent_reward_usd',
        'respondent_payout_at',
        'respondent_payout_wallet_tx_id',
    ];

    protected function casts(): array
    {
        return [
            'answers' => 'array',
            'respondent' => 'array',
            'completed' => 'boolean',
            'completion_time_sec' => 'integer',
            'respondent_reward_usd' => 'decimal:2',
            'respondent_payout_at' => 'datetime',
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

    public function respondent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'respondent_user_id');
    }

    public function earning(): HasOne
    {
        return $this->hasOne(Earning::class);
    }

    public function respondentPayoutWalletTransaction(): BelongsTo
    {
        return $this->belongsTo(WalletTransaction::class, 'respondent_payout_wallet_tx_id');
    }
}

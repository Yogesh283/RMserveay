<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Survey extends Model
{
    public const TIER_FREE = 'free';

    public const TIER_PANEL = 'panel';

    public const TIER_SUB_PANEL = 'sub_panel';

    public const TIER_SUPER_PANEL = 'super_panel';

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'status',
        'member_tier',
        'response_count',
        'earnings_total',
        'target_audience',
    ];

    protected function casts(): array
    {
        return [
            'target_audience' => 'array',
            'earnings_total' => 'decimal:2',
        ];
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(SurveyQuestion::class)->orderBy('sort_order');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(SurveyResponse::class);
    }
}

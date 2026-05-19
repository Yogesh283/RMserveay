<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Survey extends Model
{
    public const TIER_FREE = 'free';

    /**
     * Same value as the legacy "panel" tier — represents the $11 active
     * panelist membership ($1 activation + $10 minimum panel fee).
     */
    public const TIER_PANEL = 'panel';

    public const TIER_SUB_PANEL = 'sub_panel';

    public const TIER_SUPER_PANEL = 'super_panel';

    /**
     * Human labels for each tier — used by admin (Filament) form/table and any
     * API responses that want to render a friendly name.
     *
     * @return array<string, string>
     */
    public static function tierOptions(): array
    {
        return [
            self::TIER_FREE => 'Free (inactive members only)',
            self::TIER_PANEL => 'Active Panel survey',
            self::TIER_SUB_PANEL => 'Sub Panel survey',
            self::TIER_SUPER_PANEL => 'Super Panel survey',
        ];
    }

    public static function tierLabel(?string $tier): string
    {
        $opts = self::tierOptions();

        return $opts[$tier ?? self::TIER_FREE] ?? (string) $tier;
    }

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

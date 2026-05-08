<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Snapshot row per user that has paid the $10 minimum-panel-fee (active panelist).
 * Maintained alongside users.minimum_panel_fee_paid_at — kept in sync via
 * PanelEnrollmentService and the binary:backfill-panel-enrollments command.
 */
class ActivePanelUser extends Model
{
    use HasFactory;

    protected $table = 'active_panel_users';

    protected $fillable = [
        'user_id',
        'activated_at',
        'total_paid_usd',
    ];

    protected $casts = [
        'activated_at' => 'datetime',
        'total_paid_usd' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

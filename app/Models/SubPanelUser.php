<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Snapshot row per user with sub_panel_count > 0. Tracks lifetime sub-panel
 * purchases — counter, first / last purchase timestamps and total paid USD.
 * Wallet transactions still hold the per-event ledger.
 */
class SubPanelUser extends Model
{
    use HasFactory;

    protected $table = 'sub_panel_users';

    protected $fillable = [
        'user_id',
        'panels_count',
        'first_purchased_at',
        'last_purchased_at',
        'total_paid_usd',
    ];

    protected $casts = [
        'panels_count' => 'integer',
        'first_purchased_at' => 'datetime',
        'last_purchased_at' => 'datetime',
        'total_paid_usd' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

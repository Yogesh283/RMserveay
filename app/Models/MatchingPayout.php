<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Paid-users-only matching payout entry.
 *
 * One row per (user_id, scope, closing_date). Only inserted when payout_usd > 0
 * — i.e. only users who actually received income on that day for that scope.
 *
 * Source-of-truth columns mirror binary_daily_closings + wallet_transactions
 * but filtered to "successful payouts only" for fast lookup / reporting.
 */
class MatchingPayout extends Model
{
    public const SCOPE_ACTIVE_PANEL = 'active_panel';

    public const SCOPE_PANEL = 'panel'; // sub-panel matching

    public const SCOPE_SUPER = 'super'; // super-sub-panel matching

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'scope',
        'closing_date',
        'pairs_matched',
        'milestone',
        'lapsed_pairs',
        'payout_usd',
        'balance_after_usd',
        'binary_daily_closing_id',
        'wallet_transaction_id',
        'meta',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'closing_date' => 'date',
            'pairs_matched' => 'integer',
            'milestone' => 'integer',
            'lapsed_pairs' => 'integer',
            'payout_usd' => 'decimal:2',
            'balance_after_usd' => 'decimal:2',
            'meta' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, MatchingPayout>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<BinaryDailyClosing, MatchingPayout>
     */
    public function binaryDailyClosing(): BelongsTo
    {
        return $this->belongsTo(BinaryDailyClosing::class);
    }

    /**
     * @return BelongsTo<WalletTransaction, MatchingPayout>
     */
    public function walletTransaction(): BelongsTo
    {
        return $this->belongsTo(WalletTransaction::class);
    }
}

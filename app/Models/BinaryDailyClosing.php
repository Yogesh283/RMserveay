<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per user × calendar-date × scope produced by the binary closing job.
 * Acts as the audit / reporting source-of-truth for daily binary income.
 */
class BinaryDailyClosing extends Model
{
    public const SCOPE_PANEL = 'panel';

    public const SCOPE_SUPER = 'super';

    /** @var list<string> */
    protected $fillable = [
        'user_id',
        'closing_date',
        'scope',
        'left_carry_in',
        'right_carry_in',
        'pairs_matched',
        'cap_hit',
        'per_pair_usd',
        'payout_usd',
        'balance_after_usd',
        'left_carry_out',
        'right_carry_out',
        'left_lapsed',
        'right_lapsed',
        'wallet_transaction_id',
        'meta',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'closing_date' => 'date',
            'cap_hit' => 'boolean',
            'per_pair_usd' => 'decimal:2',
            'payout_usd' => 'decimal:2',
            'balance_after_usd' => 'decimal:2',
            'meta' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function walletTransaction(): BelongsTo
    {
        return $this->belongsTo(WalletTransaction::class);
    }
}

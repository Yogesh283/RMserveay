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

    public const SCOPE_ACTIVE_PANEL = 'active_panel';

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

    /**
     * Latest closing row for UI: prefer a run credited today (wallet cron), else
     * the most recent audit row for this scope.
     */
    public static function latestForDisplay(int $userId, string $scope): ?self
    {
        $todayRun = static::query()
            ->where('user_id', $userId)
            ->where('scope', $scope)
            ->whereDate('created_at', now()->toDateString())
            ->latest('id')
            ->first();

        if ($todayRun !== null) {
            return $todayRun;
        }

        return static::query()
            ->where('user_id', $userId)
            ->where('scope', $scope)
            ->latest('id')
            ->first();
    }
}

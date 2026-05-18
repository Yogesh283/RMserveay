<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Wallet extends Model
{
    /** @var string */
    protected $table = 'wallet';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'wallet_balance',
        'p2p_wallet_balance',
        'survey_wallet_balance',
        'main_deposit_balance',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'wallet_balance' => 'decimal:2',
            'p2p_wallet_balance' => 'decimal:2',
            'survey_wallet_balance' => 'decimal:2',
            'main_deposit_balance' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<User, Wallet>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

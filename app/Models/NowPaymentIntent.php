<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NowPaymentIntent extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'order_id',
        'payment_id',
        'amount_usd',
        'pay_currency',
        'pay_amount',
        'pay_address',
        'payment_status',
        'credited',
        'payin_hash',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount_usd' => 'decimal:2',
            'pay_amount' => 'decimal:12',
            'credited' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

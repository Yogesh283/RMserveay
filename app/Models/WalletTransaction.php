<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletTransaction extends Model
{
    public const TYPE_SURVEY_CREDIT = 'survey_credit';

    public const TYPE_ACTIVATION_FEE = 'activation_fee';

    public const TYPE_MINIMUM_PANEL_FEE = 'minimum_panel_fee';

    public const TYPE_SUB_PANEL_FEE = 'sub_panel_fee';

    public const TYPE_SUPER_SUB_PANEL_FEE = 'super_sub_panel_fee';

    public const TYPE_DIRECT_COMMISSION = 'direct_commission';

    public const TYPE_PANEL_MATCHING = 'panel_matching';

    public const TYPE_ACTIVE_PANEL_MATCHING = 'active_panel_matching';

    public const TYPE_SUB_PANEL_MATCHING = 'sub_panel_matching';

    public const TYPE_SUPER_SUB_PANEL_MATCHING = 'super_sub_panel_matching';

    public const TYPE_SURVEY_LEVEL_INCOME = 'survey_level_income';

    public const TYPE_DEPOSIT_CREDIT = 'deposit_credit';

    public const TYPE_P2P_TRANSFER_OUT = 'p2p_transfer_out';

    public const TYPE_P2P_TRANSFER_IN = 'p2p_transfer_in';

    public const TYPE_WITHDRAWAL = 'withdrawal';

    public const TYPE_MAIN_TO_P2P = 'main_to_p2p';

    public const TYPE_SURVEY_TO_P2P = 'survey_to_p2p';

    public const TYPE_P2P_TO_MAIN = 'p2p_to_main';

    public const TYPE_PLAN_PURCHASE = 'plan_purchase';

    public const TYPE_SIGNUP_BONUS = 'signup_bonus';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'type',
        'amount',
        'balance_after',
        'meta',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'balance_after' => 'decimal:2',
            'meta' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

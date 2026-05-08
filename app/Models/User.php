<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable implements FilamentUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'login_uid',
        'password',
        'user_type',
        'profile',
        'survey_profile',
        'qualification',
        'phone',
        'referral_code',
        'sponsor_id',
        'binary_parent_id',
        'binary_side',
        'left_child_id',
        'right_child_id',
        'p2p_receive_code',
        'wallet_balance',
        'p2p_wallet_balance',
        'usdt_bep20_withdrawal_address',
        'activation_fee_paid_at',
        'minimum_panel_fee_paid_at',
        'sub_panel_count',
        'super_sub_panel_count',
        'membership_tier',
        'panel_match_carry_left',
        'panel_match_carry_right',
        'spm_match_day',
        'spm_cumulative_panels',
        'spm_milestone_mask',
        'super_panel_match_carry_left',
        'super_panel_match_carry_right',
        'sspm_match_day',
        'sspm_cumulative_panels',
        'sspm_milestone_mask',
        'profile_completed_at',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'wallet_balance',
        'p2p_wallet_balance',
        'usdt_bep20_withdrawal_address',
        'activation_fee_paid_at',
        'minimum_panel_fee_paid_at',
        'sub_panel_count',
        'super_sub_panel_count',
        'panel_match_carry_left',
        'panel_match_carry_right',
        'spm_match_day',
        'spm_cumulative_panels',
        'spm_milestone_mask',
        'super_panel_match_carry_left',
        'super_panel_match_carry_right',
        'sspm_match_day',
        'sspm_cumulative_panels',
        'sspm_milestone_mask',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'profile_completed_at' => 'datetime',
            'password' => 'hashed',
            'survey_profile' => 'array',
            'wallet_balance' => 'decimal:2',
            'p2p_wallet_balance' => 'decimal:2',
            'activation_fee_paid_at' => 'datetime',
            'minimum_panel_fee_paid_at' => 'datetime',
            'spm_match_day' => 'date',
            'sspm_match_day' => 'date',
            'membership_tier' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        /** Unique internal P2P receive id (QR / paste) — assigned before insert. */
        static::creating(function (User $user) {
            if ($user->p2p_receive_code === null || $user->p2p_receive_code === '') {
                $user->p2p_receive_code = self::generateP2pReceiveCode();
            }
        });

        /** Every new user gets a `wallet` row (main + P2P) as soon as the user row exists — including registration. */
        static::created(function (User $user) {
            Wallet::query()->firstOrCreate(
                ['user_id' => $user->id],
                [
                    'wallet_balance' => $user->wallet_balance ?? '0.00',
                    'p2p_wallet_balance' => $user->p2p_wallet_balance ?? '0.00',
                ]
            );
        });

        /** Keep `wallet` in sync when balances change on existing users (skip create: handled above). */
        static::saved(function (User $user) {
            if ($user->wasRecentlyCreated) {
                return;
            }
            if (! $user->wasChanged(['wallet_balance', 'p2p_wallet_balance'])) {
                return;
            }

            $user->wallet()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'wallet_balance' => $user->wallet_balance,
                    'p2p_wallet_balance' => $user->p2p_wallet_balance,
                ]
            );
        });
    }

    /**
     * SPA payload: `user_type` follows the Normal/Publisher tab used at login (session), not only the DB column.
     *
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        $data = $this->toArray();
        $loginType = session('app_login_user_type');
        if (is_string($loginType) && in_array($loginType, ['normal', 'publisher'], true)) {
            $data['user_type'] = $loginType;
        }

        $data['sponsor_referral_code'] = $this->sponsor?->referral_code;
        $data['sponsor_name'] = $this->sponsor?->name;
        $data['referral_left_slot_available'] = $this->left_child_id === null;
        $data['referral_right_slot_available'] = $this->right_child_id === null;

        /** Not in `toArray()` because these are in $hidden — SPA needs them for display. */
        $b = $this->balancesForApi();
        $data['wallet_balance'] = $b['wallet_balance'];
        $data['p2p_wallet_balance'] = $b['p2p_wallet_balance'];
        $data['p2p_receive_code'] = (string) $this->p2p_receive_code;

        return $data;
    }

    /**
     * Unique code for P2P→P2P transfers (QR payload uses prefix {@see P2P_RECEIVE_QR_PREFIX}).
     */
    public static function generateP2pReceiveCode(): string
    {
        do {
            $code = 'RMS'.strtoupper(Str::random(12));
        } while (self::where('p2p_receive_code', $code)->exists());

        return $code;
    }

    public const P2P_RECEIVE_QR_PREFIX = 'rms:p2p:';

    /**
     * Normalize scanned / pasted QR text into a stored `p2p_receive_code`, or null if invalid.
     */
    public static function parseP2pReceivePayload(string $raw): ?string
    {
        $s = trim($raw);
        if ($s === '') {
            return null;
        }

        $prefix = self::P2P_RECEIVE_QR_PREFIX;
        if (stripos($s, $prefix) === 0) {
            $code = strtoupper(substr($s, strlen($prefix)));
        } else {
            $code = strtoupper($s);
        }

        if (preg_match('/^RMS[A-Z0-9]{12}$/', $code)) {
            return $code;
        }

        return null;
    }

    /**
     * Resolved main + P2P balances for JSON after reconciling mirror drift.
     * Prefer `wallet` when its row was updated more recently (e.g. phpMyAdmin fix on `wallet`).
     *
     * @return array{wallet_balance: string, p2p_wallet_balance: string}
     */
    public function balancesForApi(): array
    {
        $this->loadMissing('wallet');
        if ($this->wallet === null) {
            return [
                'wallet_balance' => (string) $this->wallet_balance,
                'p2p_wallet_balance' => (string) $this->p2p_wallet_balance,
            ];
        }

        $wm = (string) $this->wallet->wallet_balance;
        $wp = (string) $this->wallet->p2p_wallet_balance;
        $um = (string) $this->wallet_balance;
        $up = (string) $this->p2p_wallet_balance;

        $wu = $this->wallet->updated_at;
        $uu = $this->updated_at;

        if ($wu !== null && $uu !== null && $wu->gt($uu)) {
            return ['wallet_balance' => $wm, 'p2p_wallet_balance' => $wp];
        }

        if ($wu !== null && $uu !== null && $uu->gt($wu)) {
            return ['wallet_balance' => $um, 'p2p_wallet_balance' => $up];
        }

        if (bccomp($wm, $um, 2) !== 0 || bccomp($wp, $up, 2) !== 0) {
            return ['wallet_balance' => $wm, 'p2p_wallet_balance' => $wp];
        }

        return ['wallet_balance' => $um, 'p2p_wallet_balance' => $up];
    }

    /**
     * Align `users` with the `wallet` mirror when rows drift (manual SQL, imports).
     * Newer row wins by `updated_at`; tie / missing timestamps prefer mirror when amounts differ.
     */
    public function reconcileBalancesFromWalletTableIfBlank(): bool
    {
        $this->loadMissing('wallet');
        if ($this->wallet === null) {
            return false;
        }

        $wm = (string) $this->wallet->wallet_balance;
        $wp = (string) $this->wallet->p2p_wallet_balance;
        $um = (string) $this->wallet_balance;
        $up = (string) $this->p2p_wallet_balance;

        if (bccomp($wm, $um, 2) === 0 && bccomp($wp, $up, 2) === 0) {
            return false;
        }

        $wu = $this->wallet->updated_at;
        $uu = $this->updated_at;

        if ($wu !== null && $uu !== null && $uu->gt($wu)) {
            $this->wallet->forceFill([
                'wallet_balance' => $um,
                'p2p_wallet_balance' => $up,
            ])->save();

            return true;
        }

        $this->wallet_balance = $wm;
        $this->p2p_wallet_balance = $wp;
        $this->save();

        return true;
    }

    public function hasCompletedProfile(): bool
    {
        return $this->profile_completed_at !== null;
    }

    public static function generateReferralCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (self::where('referral_code', $code)->exists());

        return $code;
    }

    public function sponsor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sponsor_id');
    }

    public function binaryParent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'binary_parent_id');
    }

    public function walletTransactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class);
    }

    /** Main + P2P balances mirrored in `wallet` table (one row per user). */
    public function wallet(): HasOne
    {
        return $this->hasOne(Wallet::class);
    }

    /** @return HasMany<User, User> */
    public function referrals(): HasMany
    {
        return $this->hasMany(User::class, 'sponsor_id');
    }

    /** @return HasMany<Survey, User> */
    public function surveys(): HasMany
    {
        return $this->hasMany(Survey::class);
    }

    public function canAccessPanel(Panel $panel): bool
    {
        if ($panel->getId() !== 'admin') {
            return false;
        }

        $email = strtolower((string) $this->email);
        $uid = strtolower((string) $this->login_uid);

        $allowedEmails = array_values(array_filter(array_map(
            static fn (string $v): string => strtolower(trim($v)),
            explode(',', (string) env('FILAMENT_ADMIN_EMAILS', ''))
        )));
        $allowedUids = array_values(array_filter(array_map(
            static fn (string $v): string => strtolower(trim($v)),
            explode(',', (string) env('FILAMENT_ADMIN_LOGIN_UIDS', ''))
        )));

        return in_array($email, $allowedEmails, true) || in_array($uid, $allowedUids, true);
    }

    public function qualifiesActivePanelistIncome(): bool
    {
        return $this->activation_fee_paid_at !== null && $this->minimum_panel_fee_paid_at !== null;
    }

    /**
     * Direct income (10%): active panelist + $1 activation (via active path) + at least one sub or super sub panel slot.
     */
    public function qualifiesForDirectIncome(): bool
    {
        if (! $this->qualifiesActivePanelistIncome()) {
            return false;
        }

        return ((int) $this->sub_panel_count + (int) $this->super_sub_panel_count) >= 1;
    }

    /** Earner must complete full sub-panel slots (default 9/9) to receive sub-panel matching income. */
    public function qualifiesForPanelMatchingIncome(): bool
    {
        $required = (int) config('self_survey.max_sub_panels', 9);

        return (int) $this->sub_panel_count >= $required;
    }

    /** Earner must complete full super-panel slots (default 9/9) to receive super-panel matching income. */
    public function qualifiesForSuperSubPanelMatchingIncome(): bool
    {
        $required = (int) config('self_survey.max_super_sub_panels', 9);

        return (int) $this->super_sub_panel_count >= $required;
    }
}

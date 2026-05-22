<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\AdminImpersonation;
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
        'survey_wallet_balance',
        'main_deposit_balance',
        'usdt_bep20_withdrawal_address',
        'activation_fee_paid_at',
        'minimum_panel_fee_paid_at',
        'sub_panel_count',
        'super_sub_panel_count',
        'membership_tier',
        'panel_match_carry_left',
        'panel_match_carry_right',
        'active_panel_match_carry_left',
        'active_panel_match_carry_right',
        'spm_match_day',
        'spm_cumulative_panels',
        'spm_milestone_mask',
        'spm_pair_carry_forward',
        'super_panel_match_carry_left',
        'super_panel_match_carry_right',
        'sspm_match_day',
        'sspm_cumulative_panels',
        'sspm_milestone_mask',
        'sspm_pair_carry_forward',
        'profile_completed_at',
        'account_blocked_at',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'wallet_balance',
        'p2p_wallet_balance',
        'survey_wallet_balance',
        'main_deposit_balance',
        'usdt_bep20_withdrawal_address',
        'activation_fee_paid_at',
        'minimum_panel_fee_paid_at',
        'sub_panel_count',
        'super_sub_panel_count',
        'panel_match_carry_left',
        'panel_match_carry_right',
        'active_panel_match_carry_left',
        'active_panel_match_carry_right',
        'spm_match_day',
        'spm_cumulative_panels',
        'spm_milestone_mask',
        'spm_pair_carry_forward',
        'super_panel_match_carry_left',
        'super_panel_match_carry_right',
        'sspm_match_day',
        'sspm_cumulative_panels',
        'sspm_milestone_mask',
        'sspm_pair_carry_forward',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'profile_completed_at' => 'datetime',
            'account_blocked_at' => 'datetime',
            'password' => 'hashed',
            'survey_profile' => 'array',
            'wallet_balance' => 'decimal:2',
            'p2p_wallet_balance' => 'decimal:2',
            'survey_wallet_balance' => 'decimal:2',
            'main_deposit_balance' => 'decimal:2',
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
            $bonusEnabled = (bool) config('wallet_signup_bonus.enabled', false);
            $bonusAmount = (string) config('wallet_signup_bonus.amount_usd', '0.00');

            $startingBalance = (string) ($user->wallet_balance ?? '0.00');
            $shouldGrant = $bonusEnabled
                && bccomp($bonusAmount, '0', 2) > 0
                && bccomp($startingBalance, '0', 2) === 0;

            if ($shouldGrant) {
                $startingBalance = bcadd($startingBalance, $bonusAmount, 2);
                $user->wallet_balance = $startingBalance;
                $user->saveQuietly();
            }

            Wallet::query()->firstOrCreate(
                ['user_id' => $user->id],
                [
                    'wallet_balance' => $startingBalance,
                    'p2p_wallet_balance' => $user->p2p_wallet_balance ?? '0.00',
                    'survey_wallet_balance' => $user->survey_wallet_balance ?? '0.00',
                    'main_deposit_balance' => $user->main_deposit_balance ?? '0.00',
                ]
            );

            if ($shouldGrant) {
                WalletTransaction::query()->create([
                    'user_id' => $user->id,
                    'type' => WalletTransaction::TYPE_SIGNUP_BONUS,
                    'amount' => $bonusAmount,
                    'balance_after' => $startingBalance,
                    'meta' => [
                        'reason' => 'default signup wallet credit',
                        'config_key' => 'wallet_signup_bonus.amount_usd',
                    ],
                ]);
            }
        });

        /** Keep `wallet` in sync when balances change on existing users (skip create: handled above). */
        static::saved(function (User $user) {
            if ($user->wasRecentlyCreated) {
                return;
            }
            if (! $user->wasChanged(['wallet_balance', 'p2p_wallet_balance', 'survey_wallet_balance', 'main_deposit_balance'])) {
                return;
            }

            $user->wallet()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'wallet_balance' => $user->wallet_balance,
                    'p2p_wallet_balance' => $user->p2p_wallet_balance,
                    'survey_wallet_balance' => $user->survey_wallet_balance,
                    'main_deposit_balance' => $user->main_deposit_balance,
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
        $sponsor = $this->sponsor;
        $data['sponsor_login_uid'] = ($sponsor !== null && $sponsor->login_uid !== null && $sponsor->login_uid !== '')
            ? strtoupper((string) $sponsor->login_uid)
            : null;
        $data['referral_left_slot_available'] = $this->left_child_id === null;
        $data['referral_right_slot_available'] = $this->right_child_id === null;

        /** Not in `toArray()` because these are in $hidden — SPA needs them for display. */
        $b = $this->balancesForApi();
        $data['wallet_balance'] = $b['wallet_balance'];
        $data['p2p_wallet_balance'] = $b['p2p_wallet_balance'];
        $data['survey_wallet_balance'] = $b['survey_wallet_balance'];
        $data['p2p_receive_code'] = (string) $this->p2p_receive_code;
        $data['account_blocked'] = $this->isAccountBlocked();

        if (AdminImpersonation::isActive()) {
            $data['admin_impersonation'] = true;
            $data['admin_impersonation_exit_url'] = route('admin.impersonate.leave');
        }

        return $data;
    }

    public function isAccountBlocked(): bool
    {
        return $this->account_blocked_at !== null;
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
     * @return array{wallet_balance: string, p2p_wallet_balance: string, survey_wallet_balance: string, main_deposit_balance: string}
     */
    public function balancesForApi(): array
    {
        $this->loadMissing('wallet');
        if ($this->wallet === null) {
            return [
                'wallet_balance' => (string) $this->wallet_balance,
                'p2p_wallet_balance' => (string) $this->p2p_wallet_balance,
                'survey_wallet_balance' => (string) ($this->survey_wallet_balance ?? '0.00'),
                'main_deposit_balance' => (string) ($this->main_deposit_balance ?? '0.00'),
            ];
        }

        $wm = (string) $this->wallet->wallet_balance;
        $wp = (string) $this->wallet->p2p_wallet_balance;
        $ws = (string) ($this->wallet->survey_wallet_balance ?? '0.00');
        $wd = (string) ($this->wallet->main_deposit_balance ?? '0.00');
        $um = (string) $this->wallet_balance;
        $up = (string) $this->p2p_wallet_balance;
        $us = (string) ($this->survey_wallet_balance ?? '0.00');
        $ud = (string) ($this->main_deposit_balance ?? '0.00');

        $wu = $this->wallet->updated_at;
        $uu = $this->updated_at;

        if ($wu !== null && $uu !== null && $wu->gt($uu)) {
            return [
                'wallet_balance' => $wm,
                'p2p_wallet_balance' => $wp,
                'survey_wallet_balance' => $ws,
                'main_deposit_balance' => $wd,
            ];
        }

        if ($wu !== null && $uu !== null && $uu->gt($wu)) {
            return [
                'wallet_balance' => $um,
                'p2p_wallet_balance' => $up,
                'survey_wallet_balance' => $us,
                'main_deposit_balance' => $ud,
            ];
        }

        if (bccomp($wm, $um, 2) !== 0 || bccomp($wp, $up, 2) !== 0 || bccomp($ws, $us, 2) !== 0 || bccomp($wd, $ud, 2) !== 0) {
            return [
                'wallet_balance' => $wm,
                'p2p_wallet_balance' => $wp,
                'survey_wallet_balance' => $ws,
                'main_deposit_balance' => $wd,
            ];
        }

        return [
            'wallet_balance' => $um,
            'p2p_wallet_balance' => $up,
            'survey_wallet_balance' => $us,
            'main_deposit_balance' => $ud,
        ];
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
        $ws = (string) ($this->wallet->survey_wallet_balance ?? '0.00');
        $wd = (string) ($this->wallet->main_deposit_balance ?? '0.00');
        $um = (string) $this->wallet_balance;
        $up = (string) $this->p2p_wallet_balance;
        $us = (string) ($this->survey_wallet_balance ?? '0.00');
        $ud = (string) ($this->main_deposit_balance ?? '0.00');

        if (bccomp($wm, $um, 2) === 0 && bccomp($wp, $up, 2) === 0 && bccomp($ws, $us, 2) === 0 && bccomp($wd, $ud, 2) === 0) {
            return false;
        }

        $wu = $this->wallet->updated_at;
        $uu = $this->updated_at;

        if ($wu !== null && $uu !== null && $uu->gt($wu)) {
            $this->wallet->forceFill([
                'wallet_balance' => $um,
                'p2p_wallet_balance' => $up,
                'survey_wallet_balance' => $us,
                'main_deposit_balance' => $ud,
            ])->save();

            return true;
        }

        $this->wallet_balance = $wm;
        $this->p2p_wallet_balance = $wp;
        $this->survey_wallet_balance = $ws;
        $this->main_deposit_balance = $wd;
        $this->save();

        return true;
    }

    public function hasCompletedProfile(): bool
    {
        return $this->profile_completed_at !== null;
    }

    /**
     * Detect users created by `php artisan dummy:place`.
     *
     * Dummy users are minted with `*@dummy.test` emails. Filter / hide them
     * from public-facing aggregations (team page, leaderboards, etc.) so a
     * sponsor's tree only shows real members.
     */
    public function isDummy(): bool
    {
        return is_string($this->email) && str_ends_with(strtolower($this->email), '@dummy.test');
    }

    /**
     * Eloquent query scope to exclude dummy users.
     *
     * @param  \Illuminate\Database\Eloquent\Builder<User>  $query
     * @return \Illuminate\Database\Eloquent\Builder<User>
     */
    public function scopeExcludeDummy($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('email')->orWhere('email', 'not like', '%@dummy.test');
        });
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
            (array) config('admin.filament_admin_emails', [])
        )));
        $allowedUids = array_values(array_filter(array_map(
            static fn (string $v): string => strtolower(trim($v)),
            (array) config('admin.filament_admin_login_uids', [])
        )));

        return in_array($email, $allowedEmails, true) || in_array($uid, $allowedUids, true);
    }

    public function qualifiesActivePanelistIncome(): bool
    {
        return $this->activation_fee_paid_at !== null && $this->minimum_panel_fee_paid_at !== null;
    }

    /**
     * Direct income (10%): sponsor only needs to be an active panelist
     * (activation fee + minimum panel fee paid). Once the downline activates
     * and buys any panel/fee, the 10% flows immediately.
     */
    public function qualifiesForDirectIncome(): bool
    {
        return $this->qualifiesActivePanelistIncome();
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

    /**
     * Whether this user may receive binary closing income for a scope.
     *
     * @param  string  $scope  `active_panel` | `panel` | `super`
     */
    public function qualifiesBinaryClosingIncome(string $scope): bool
    {
        return match ($scope) {
            BinaryDailyClosing::SCOPE_ACTIVE_PANEL => $this->qualifiesActivePanelistIncome(),
            BinaryDailyClosing::SCOPE_PANEL => $this->qualifiesForPanelMatchingIncome(),
            BinaryDailyClosing::SCOPE_SUPER => $this->qualifiesForSuperSubPanelMatchingIncome(),
            default => false,
        };
    }

    /**
     * @param  string  $scope  `active_panel` | `panel` | `super`
     */
    public function binaryClosingIncomeBlockedReason(string $scope): ?string
    {
        if ($this->qualifiesBinaryClosingIncome($scope)) {
            return null;
        }

        return match ($scope) {
            BinaryDailyClosing::SCOPE_PANEL => $this->qualifiesActivePanelistIncome()
                ? 'incomplete_sub_panels'
                : 'inactive_panelist',
            BinaryDailyClosing::SCOPE_SUPER => $this->qualifiesActivePanelistIncome()
                ? 'incomplete_super_panels'
                : 'inactive_panelist',
            default => 'inactive_panelist',
        };
    }
}

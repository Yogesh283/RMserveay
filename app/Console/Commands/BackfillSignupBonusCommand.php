<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Credit the configured signup bonus (config: wallet_signup_bonus.amount_usd)
 * to every existing user who hasn't received it yet.
 *
 * Idempotency: a user is skipped if a wallet_transactions row of type
 * `signup_bonus` already exists for them. Safe to re-run.
 *
 * Usage:
 *   php artisan wallet:backfill-signup-bonus --dry
 *   php artisan wallet:backfill-signup-bonus           # apply
 *   php artisan wallet:backfill-signup-bonus --user=42 # single user
 */
class BackfillSignupBonusCommand extends Command
{
    protected $signature = 'wallet:backfill-signup-bonus
        {--dry : Show what would change without writing.}
        {--user= : Restrict to a single user id.}';

    protected $description = 'Credit the default signup wallet bonus to existing users that have never received it.';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry');
        $onlyUser = $this->option('user');

        if (! (bool) config('wallet_signup_bonus.enabled', false)) {
            $this->warn('wallet_signup_bonus.enabled is false — nothing to do.');

            return self::SUCCESS;
        }

        $bonus = (string) config('wallet_signup_bonus.amount_usd', '0.00');
        if (bccomp($bonus, '0', 2) <= 0) {
            $this->warn("Configured bonus amount is {$bonus} — nothing to do.");

            return self::SUCCESS;
        }

        $alreadyCreditedIds = WalletTransaction::query()
            ->where('type', WalletTransaction::TYPE_SIGNUP_BONUS)
            ->pluck('user_id')
            ->map(fn ($v) => (int) $v)
            ->all();

        $q = User::query()->whereNotIn('id', $alreadyCreditedIds);
        if ($onlyUser !== null) {
            $q->whereKey((int) $onlyUser);
        }

        $users = $q->get(['id', 'name', 'email', 'wallet_balance']);

        $this->info(sprintf('Eligible users: %d (bonus = $%s) %s', $users->count(), $bonus, $dry ? '[DRY-RUN]' : ''));

        $applied = 0;
        foreach ($users as $u) {
            $newBalance = bcadd((string) $u->wallet_balance, $bonus, 2);
            $this->line(sprintf('  #%d %s — %s → %s', $u->id, $u->email ?? $u->name ?? '?', $u->wallet_balance, $newBalance));

            if ($dry) {
                continue;
            }

            DB::transaction(function () use ($u, $bonus, $newBalance) {
                $locked = User::query()->whereKey($u->id)->lockForUpdate()->first();
                if ($locked === null) {
                    return;
                }

                $alreadyHas = WalletTransaction::query()
                    ->where('user_id', $locked->id)
                    ->where('type', WalletTransaction::TYPE_SIGNUP_BONUS)
                    ->exists();
                if ($alreadyHas) {
                    return;
                }

                $newBalanceLocked = bcadd((string) $locked->wallet_balance, $bonus, 2);
                $locked->wallet_balance = $newBalanceLocked;
                $locked->save();

                Wallet::query()->updateOrCreate(
                    ['user_id' => $locked->id],
                    [
                        'wallet_balance' => $newBalanceLocked,
                        'p2p_wallet_balance' => $locked->p2p_wallet_balance ?? '0.00',
                    ]
                );

                WalletTransaction::query()->create([
                    'user_id' => $locked->id,
                    'type' => WalletTransaction::TYPE_SIGNUP_BONUS,
                    'amount' => $bonus,
                    'balance_after' => $newBalanceLocked,
                    'meta' => [
                        'reason' => 'backfill default signup wallet credit',
                        'config_key' => 'wallet_signup_bonus.amount_usd',
                    ],
                ]);
            });

            $applied++;
        }

        $this->info(sprintf('Done. %d users credited. %s', $applied, $dry ? '[DRY-RUN]' : ''));

        return self::SUCCESS;
    }
}

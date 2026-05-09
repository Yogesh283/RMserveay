<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\BinaryPlacementService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Create N dummy users on each leg of a sponsor's binary tree using the
 * existing BinaryPlacementService (DFS extreme placement — deepest-leftmost
 * for `left`, deepest-rightmost for `right`). Safe for live use:
 *  - all unique columns (email, login_uid, referral_code, p2p_receive_code)
 *    auto-generated and pre-checked,
 *  - everything wrapped in a single DB transaction (rollback on failure),
 *  - no wallet credit / no fee debit / no income hooks fired.
 *
 *  php artisan dummy:place --sponsor=Y1JZS3SF --left=25 --right=25
 *  php artisan dummy:place --sponsor=Y1JZS3SF --left=25 --right=25 --dry
 *  php artisan dummy:place --sponsor=Y1JZS3SF --left=25 --right=25 --prefix=DUM
 */
class CreateDummyTeamCommand extends Command
{
    protected $signature = 'dummy:place
        {--sponsor= : Sponsor referral code (e.g. Y1JZS3SF) — required.}
        {--left=0 : Number of dummy users to chain on the deepest-left slot.}
        {--right=0 : Number of dummy users to chain on the deepest-right slot.}
        {--prefix=DUM : Display-name prefix for the generated users.}
        {--password=Dummy@123 : Plain password for every dummy user (hashed before insert).}
        {--dry : Show what would happen without writing anything.}';

    protected $description = 'Place N dummy users on each leg of a sponsor (DFS extreme placement). For testing / tree-building only.';

    public function handle(BinaryPlacementService $placement): int
    {
        $code = strtoupper(trim((string) $this->option('sponsor')));
        $left = (int) $this->option('left');
        $right = (int) $this->option('right');
        $prefix = strtoupper(trim((string) $this->option('prefix'))) ?: 'DUM';
        $plainPassword = (string) $this->option('password');
        $dry = (bool) $this->option('dry');

        if ($code === '') {
            $this->error('--sponsor is required (referral_code, e.g. Y1JZS3SF).');

            return self::INVALID;
        }
        if ($left < 0 || $right < 0 || ($left === 0 && $right === 0)) {
            $this->error('Provide --left and/or --right with a positive integer.');

            return self::INVALID;
        }

        $sponsor = User::query()->where('referral_code', $code)->first();
        if ($sponsor === null) {
            $this->error("Sponsor with referral_code={$code} not found.");

            return self::FAILURE;
        }

        $this->line(sprintf(
            '<info>Dummy placement</info>  sponsor=%s (id=%d, name=%s)  left=%d  right=%d  mode=%s',
            $code,
            $sponsor->id,
            $sponsor->name ?? '-',
            $left,
            $right,
            $dry ? 'DRY-RUN' : 'APPLY',
        ));

        if ($dry) {
            $this->warn('Dry-run only — no users will be created. Drop --dry to apply.');

            return self::SUCCESS;
        }

        $hashed = Hash::make($plainPassword);
        $createdLeft = $createdRight = 0;
        $firstLeft = $firstRight = null;
        $lastLeft = $lastRight = null;

        DB::transaction(function () use ($placement, $sponsor, $left, $right, $prefix, $hashed, &$createdLeft, &$createdRight, &$firstLeft, &$firstRight, &$lastLeft, &$lastRight) {
            $now = Carbon::now();

            for ($i = 1; $i <= $left; $i++) {
                $u = $this->createDummyUser($prefix, 'L', $i, $hashed, $now);
                $res = $placement->attachUnderSponsor($sponsor, $u, 'left');
                if (! ($res['ok'] ?? false)) {
                    throw new \RuntimeException("Left #{$i}: ".($res['message'] ?? 'placement failed'));
                }
                $createdLeft++;
                $firstLeft ??= $u->login_uid;
                $lastLeft = $u->login_uid;
            }

            for ($i = 1; $i <= $right; $i++) {
                $u = $this->createDummyUser($prefix, 'R', $i, $hashed, $now);
                $res = $placement->attachUnderSponsor($sponsor, $u, 'right');
                if (! ($res['ok'] ?? false)) {
                    throw new \RuntimeException("Right #{$i}: ".($res['message'] ?? 'placement failed'));
                }
                $createdRight++;
                $firstRight ??= $u->login_uid;
                $lastRight = $u->login_uid;
            }
        });

        $this->info(sprintf('Created left=%d right=%d total=%d', $createdLeft, $createdRight, $createdLeft + $createdRight));
        if ($firstLeft) {
            $this->line("  left chain  : {$firstLeft} → … → {$lastLeft}");
        }
        if ($firstRight) {
            $this->line("  right chain : {$firstRight} → … → {$lastRight}");
        }
        $this->line('Default password for each dummy: '.$this->option('password'));

        return self::SUCCESS;
    }

    private function createDummyUser(string $prefix, string $sideTag, int $index, string $hashed, Carbon $now): User
    {
        // Build a unique-but-readable identifier set. We retry up to 5x in the
        // very unlikely case of a collision.
        for ($try = 0; $try < 5; $try++) {
            $rand = strtolower(Str::random(6));
            $loginUid = strtolower("{$prefix}{$sideTag}{$index}{$rand}");
            $email = "{$loginUid}@dummy.test";
            $referral = strtoupper(bin2hex(random_bytes(5)));

            $exists = User::query()
                ->where('login_uid', $loginUid)
                ->orWhere('email', $email)
                ->orWhere('referral_code', $referral)
                ->exists();

            if (! $exists) {
                $user = User::create([
                    'name' => "{$prefix} {$sideTag}{$index}",
                    'email' => $email,
                    'login_uid' => $loginUid,
                    'password' => $hashed,
                    'user_type' => 'normal',
                    'referral_code' => $referral,
                    'profile_completed_at' => $now,
                    'email_verified_at' => $now,
                ]);
                // p2p_receive_code is auto-assigned by the User::creating boot hook.

                return $user;
            }
        }

        throw new \RuntimeException("Could not generate a unique dummy identity for {$prefix}{$sideTag}{$index} after 5 attempts.");
    }
}

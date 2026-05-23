<?php

/**
 * Backfill only (daily closing now auto-updates ineligible carry — see BinaryDailyClosingService).
 *
 * INACTIVE / ineligible users: team page "Carry forward now" = full L/R (aaj tak).
 *
 *   Super / Sub / Active: downline leg totals (same as admin SQL SUM) — e.g. user 157 super → 18|68
 *   Wallet / payout / pairs_matched are NOT changed.
 *
 * Usage:
 *   php tools/sync_inactive_team_carry_display.php --dry
 *   php tools/sync_inactive_team_carry_display.php
 *   php tools/sync_inactive_team_carry_display.php --user=157
 */

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Services\BinarySubtreeVolumeService;
use App\Support\BinaryClosingCalendar;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

$dry = in_array('--dry', $argv, true);
$userFilter = null;
foreach ($argv as $arg) {
    if (str_starts_with($arg, '--user=')) {
        $userFilter = substr($arg, 7);
    }
}

$scopes = [
    BinaryDailyClosing::SCOPE_ACTIVE_PANEL => ['left' => 'active_panel_match_carry_left', 'right' => 'active_panel_match_carry_right'],
    BinaryDailyClosing::SCOPE_PANEL => ['left' => 'panel_match_carry_left', 'right' => 'panel_match_carry_right'],
    BinaryDailyClosing::SCOPE_SUPER => ['left' => 'super_panel_match_carry_left', 'right' => 'super_panel_match_carry_right'],
];

$volume = app(BinarySubtreeVolumeService::class);
$today = CarbonImmutable::parse(BinaryClosingCalendar::todayDateString(), BinaryClosingCalendar::timezone());

echo $dry ? "=== DRY RUN ===\n" : "=== APPLY ===\n";
echo "Today (IST): {$today->toDateString()}\n";
echo "Inactive only: carry forward = full team L|R (downline SUM / active count)\n\n";

$userQuery = User::query()->select('id')->where('email', 'not like', '%@dummy.test');
if ($userFilter !== null && $userFilter !== '') {
    if (ctype_digit((string) $userFilter)) {
        $userQuery->where('id', (int) $userFilter);
    } else {
        $userQuery->where('login_uid', $userFilter);
    }
}

$userIds = $userQuery->orderBy('id')->pluck('id')->all();

$stats = [
    'users_checked' => 0,
    'scope_syncs' => 0,
    'users_carry_updated' => 0,
    'closings_carry_fixed' => 0,
];

/**
 * @return array{0: int, 1: int}
 */
function inactiveDisplayCarry(User $user, string $scope, BinarySubtreeVolumeService $volume): array
{
    $leg = $volume->lifetimeLegVolumes($user, $scope);

    return [(int) $leg['left'], (int) $leg['right']];
}

$run = function () use ($userIds, $scopes, $volume, $today, $dry, &$stats): void {
    foreach ($userIds as $uid) {
        /** @var User|null $user */
        $user = User::query()->find($uid);
        if ($user === null || $user->isDummy()) {
            continue;
        }
        $stats['users_checked']++;
        $userDirty = false;

        foreach ($scopes as $scope => $cols) {
            if ($user->qualifiesBinaryClosingIncome($scope)) {
                continue;
            }

            $stats['scope_syncs']++;
            [$targetLeft, $targetRight] = inactiveDisplayCarry($user, $scope, $volume);
            $reason = $user->binaryClosingIncomeBlockedReason($scope) ?? 'ineligible';

            $curLeft = (int) $user->{$cols['left']};
            $curRight = (int) $user->{$cols['right']};
            if ($curLeft !== $targetLeft || $curRight !== $targetRight) {
                echo sprintf(
                    "  user #%d (%s) scope=%s [%s] carry %d|%d → %d|%d\n",
                    $user->id,
                    $user->login_uid,
                    $scope,
                    $reason,
                    $curLeft,
                    $curRight,
                    $targetLeft,
                    $targetRight,
                );
                if (! $dry) {
                    $user->{$cols['left']} = $targetLeft;
                    $user->{$cols['right']} = $targetRight;
                    $userDirty = true;
                }
                $stats['users_carry_updated']++;
            }

            /** @var BinaryDailyClosing|null $latest */
            $latest = BinaryDailyClosing::query()
                ->where('user_id', $user->id)
                ->where('scope', $scope)
                ->orderByDesc('closing_date')
                ->orderByDesc('id')
                ->first();

            if ($latest === null) {
                continue;
            }

            if ($targetLeft === (int) $latest->left_carry_out && $targetRight === (int) $latest->right_carry_out) {
                continue;
            }

            echo sprintf(
                "  closing #%d user=%d scope=%s date=%s carry_out %d|%d → %d|%d (payout=%s kept)\n",
                $latest->id,
                $user->id,
                $scope,
                $latest->closing_date->toDateString(),
                $latest->left_carry_out,
                $latest->right_carry_out,
                $targetLeft,
                $targetRight,
                $latest->payout_usd,
            );

            if (! $dry) {
                $meta = is_array($latest->meta) ? $latest->meta : [];
                $meta['team_display_carry_sync'] = $today->toDateString();
                $meta['team_display_carry_left'] = $targetLeft;
                $meta['team_display_carry_right'] = $targetRight;
                $meta['income_eligible'] = false;
                $meta['income_blocked_reason'] = $reason;
                $meta['pairs_held'] = min($targetLeft, $targetRight);

                $latest->update([
                    'left_carry_in' => $targetLeft,
                    'right_carry_in' => $targetRight,
                    'left_carry_out' => $targetLeft,
                    'right_carry_out' => $targetRight,
                    'left_lapsed' => 0,
                    'right_lapsed' => 0,
                    'meta' => $meta,
                ]);
            }
            $stats['closings_carry_fixed']++;
        }

        if (! $dry && $userDirty) {
            $user->save();
        }
    }
};

if ($dry) {
    DB::beginTransaction();
    try {
        $run();
        DB::rollBack();
    } catch (Throwable $e) {
        DB::rollBack();
        throw $e;
    }
} else {
    DB::transaction($run);
}

echo "\nSummary:\n";
foreach ($stats as $k => $v) {
    echo "  {$k}: {$v}\n";
}
if ($dry) {
    echo "\nRe-run without --dry to apply.\n";
}

<?php

/**
 * One-time: team-page carry for income-ineligible users (Active / Sub / Super).
 *
 * Target carry (matches My Team totals row + today new):
 *   Left  = total_left  + yesterday_left  (e.g. 18 + 9 = 27)
 *   Right = total_right (full leg, e.g. 68 — not post-match 50)
 *
 * Wallet / payout / pairs_matched on closings are NOT changed.
 *
 * Usage:
 *   php tools/sync_inactive_team_carry_display.php --dry
 *   php tools/sync_inactive_team_carry_display.php
 *   php tools/sync_inactive_team_carry_display.php --user=LOGIN_OR_ID
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

/**
 * @param  array<string, mixed>  $inputs
 * @return array{0: int, 1: int}
 */
function teamDisplayCarry(array $inputs): array
{
    $left = (int) $inputs['total_left'] + (int) $inputs['yesterday_left'];
    $right = (int) $inputs['total_right'];

    return [$left, $right];
}

$volume = app(BinarySubtreeVolumeService::class);
$today = CarbonImmutable::parse(BinaryClosingCalendar::todayDateString(), BinaryClosingCalendar::timezone());

echo $dry ? "=== DRY RUN ===\n" : "=== APPLY ===\n";
echo "Today (IST): {$today->toDateString()}\n";
echo "Display rule: carry L = total_left + today_new, carry R = total_right\n\n";

$userQuery = User::query()->select('id');
if ($userFilter !== null && $userFilter !== '') {
    if (ctype_digit((string) $userFilter)) {
        $userQuery->where('id', (int) $userFilter);
    } else {
        $userQuery->where('login_uid', $userFilter);
    }
} else {
    $idsFromClosings = BinaryDailyClosing::query()->distinct()->pluck('user_id');
    $idsFromCarry = User::query()
        ->where(function ($q) {
            $q->where('panel_match_carry_left', '>', 0)
                ->orWhere('panel_match_carry_right', '>', 0)
                ->orWhere('active_panel_match_carry_left', '>', 0)
                ->orWhere('active_panel_match_carry_right', '>', 0)
                ->orWhere('super_panel_match_carry_left', '>', 0)
                ->orWhere('super_panel_match_carry_right', '>', 0);
        })
        ->pluck('id');
    $userQuery->whereIn('id', $idsFromClosings->merge($idsFromCarry)->unique());
}

$userIds = $userQuery->orderBy('id')->pluck('id')->all();

$stats = [
    'users_checked' => 0,
    'scope_syncs' => 0,
    'users_carry_updated' => 0,
    'closings_carry_fixed' => 0,
];

$run = function () use ($userIds, $scopes, $volume, $today, $dry, &$stats): void {
    foreach ($userIds as $uid) {
        /** @var User|null $user */
        $user = User::query()->find($uid);
        if ($user === null) {
            continue;
        }
        $stats['users_checked']++;
        $userDirty = false;

        foreach ($scopes as $scope => $cols) {
            if ($user->qualifiesBinaryClosingIncome($scope)) {
                continue;
            }

            $stats['scope_syncs']++;
            $inputsToday = $volume->closingMatchInputs($user, $scope, $today);
            [$targetLeft, $targetRight] = teamDisplayCarry($inputsToday);
            $reason = $user->binaryClosingIncomeBlockedReason($scope) ?? 'ineligible';

            $curLeft = (int) $user->{$cols['left']};
            $curRight = (int) $user->{$cols['right']};
            if ($curLeft !== $targetLeft || $curRight !== $targetRight) {
                echo sprintf(
                    "  user #%d (%s) scope=%s [%s] carry %d|%d → %d|%d (total %d|%d +new %d|%d)\n",
                    $user->id,
                    $user->login_uid,
                    $scope,
                    $reason,
                    $curLeft,
                    $curRight,
                    $targetLeft,
                    $targetRight,
                    $inputsToday['total_left'],
                    $inputsToday['total_right'],
                    $inputsToday['yesterday_left'],
                    $inputsToday['yesterday_right'],
                );
                if (! $dry) {
                    $user->{$cols['left']} = $targetLeft;
                    $user->{$cols['right']} = $targetRight;
                    $userDirty = true;
                }
                $stats['users_carry_updated']++;
            }

            $closings = BinaryDailyClosing::query()
                ->where('user_id', $user->id)
                ->where('scope', $scope)
                ->orderByDesc('closing_date')
                ->orderByDesc('id')
                ->limit(3)
                ->get();

            foreach ($closings as $closing) {
                $closingDate = CarbonImmutable::parse(
                    $closing->closing_date->toDateString(),
                    BinaryClosingCalendar::timezone(),
                );
                $inputs = $volume->closingMatchInputs($user, $scope, $closingDate);
                [$wantL, $wantR] = teamDisplayCarry($inputs);

                if ($wantL === (int) $closing->left_carry_out && $wantR === (int) $closing->right_carry_out) {
                    continue;
                }

                echo sprintf(
                    "  closing #%d user=%d scope=%s date=%s carry_out %d|%d → %d|%d (payout=%s kept)\n",
                    $closing->id,
                    $user->id,
                    $scope,
                    $closing->closing_date->toDateString(),
                    $closing->left_carry_out,
                    $closing->right_carry_out,
                    $wantL,
                    $wantR,
                    $closing->payout_usd,
                );

                if (! $dry) {
                    $meta = is_array($closing->meta) ? $closing->meta : [];
                    $meta['team_display_carry_sync'] = $today->toDateString();
                    $meta['team_display_carry_left'] = $wantL;
                    $meta['team_display_carry_right'] = $wantR;
                    $meta['income_eligible'] = false;
                    $meta['income_blocked_reason'] = $reason;
                    $meta['pairs_held'] = min($wantL, $wantR);

                    $closing->update([
                        'left_carry_out' => $wantL,
                        'right_carry_out' => $wantR,
                        'left_lapsed' => 0,
                        'right_lapsed' => 0,
                        'meta' => $meta,
                    ]);
                }
                $stats['closings_carry_fixed']++;
            }
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

<?php

/**
 * One-time: inactive users only — set carry = team leg totals (same as simple SQL).
 *
 *   Super:  SUM(downline super_sub_panel_count)  LEFT | RIGHT
 *   Sub:    SUM(downline sub_panel_count)         LEFT | RIGHT
 *   Active: COUNT(active panelists in downline)  LEFT | RIGHT
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

$volume = app(BinarySubtreeVolumeService::class);
$today = CarbonImmutable::parse(BinaryClosingCalendar::todayDateString(), BinaryClosingCalendar::timezone());

echo $dry ? "=== DRY RUN ===\n" : "=== APPLY ===\n";
echo "Today (IST): {$today->toDateString()}\n";
echo "Rule: carry L|R = team leg total (same as SUM in tree SQL)\n\n";

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
            $legTotals = $volume->lifetimeLegVolumes($user, $scope);
            $targetLeft = (int) $legTotals['left'];
            $targetRight = (int) $legTotals['right'];
            $reason = $user->binaryClosingIncomeBlockedReason($scope) ?? 'ineligible';

            $curLeft = (int) $user->{$cols['left']};
            $curRight = (int) $user->{$cols['right']};
            if ($curLeft !== $targetLeft || $curRight !== $targetRight) {
                echo sprintf(
                    "  user #%d (%s) scope=%s [%s] carry %d|%d → %d|%d (team SQL L|R)\n",
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

            $closings = BinaryDailyClosing::query()
                ->where('user_id', $user->id)
                ->where('scope', $scope)
                ->orderByDesc('closing_date')
                ->orderByDesc('id')
                ->limit(3)
                ->get();

            foreach ($closings as $closing) {
                $wantL = $targetLeft;
                $wantR = $targetRight;

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

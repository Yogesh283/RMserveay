<?php

/**
 * One-time: sync carry for team page (Active / Sub / Super) when user is NOT income-eligible
 * for that scope. Past wrong match + payout is left unchanged — only carry columns / closing
 * carry_out are corrected so My Team shows full held L/R.
 *
 * Does NOT modify app/Services, controllers, or frontend — run manually when needed.
 *
 * Usage:
 *   php tools/sync_inactive_team_carry_display.php --dry
 *   php tools/sync_inactive_team_carry_display.php
 *   php tools/sync_inactive_team_carry_display.php --user=128
 *   php tools/sync_inactive_team_carry_display.php --closings-only   (skip users.* columns)
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
$closingsOnly = in_array('--closings-only', $argv, true);
$userFilter = 0;
foreach ($argv as $arg) {
    if (str_starts_with($arg, '--user=')) {
        $userFilter = (int) substr($arg, 7);
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
echo "Today (IST): {$today->toDateString()}\n\n";

$userIds = BinaryDailyClosing::query()
    ->when($userFilter > 0, fn ($q) => $q->where('user_id', $userFilter))
    ->distinct()
    ->orderBy('user_id')
    ->pluck('user_id')
    ->all();

if ($userFilter > 0 && $userIds === []) {
    $userIds = [$userFilter];
}

$stats = [
    'users_checked' => 0,
    'scope_syncs' => 0,
    'users_carry_updated' => 0,
    'closings_carry_fixed' => 0,
];

$run = function () use (
    $userIds,
    $scopes,
    $volume,
    $today,
    $dry,
    $closingsOnly,
    &$stats
): void {
    foreach ($userIds as $uid) {
        /** @var User|null $user */
        $user = User::query()->find($uid);
        if ($user === null) {
            continue;
        }
        $stats['users_checked']++;

        foreach ($scopes as $scope => $cols) {
            if ($user->qualifiesBinaryClosingIncome($scope)) {
                continue;
            }

            $stats['scope_syncs']++;
            $inputs = $volume->closingMatchInputs($user, $scope, $today);
            $targetLeft = (int) $inputs['left_in'];
            $targetRight = (int) $inputs['right_in'];
            $reason = $user->binaryClosingIncomeBlockedReason($scope) ?? 'ineligible';

            $closings = BinaryDailyClosing::query()
                ->where('user_id', $user->id)
                ->where('scope', $scope)
                ->orderBy('closing_date')
                ->orderBy('id')
                ->get();

            foreach ($closings as $closing) {
                $inL = (int) $closing->left_carry_in;
                $inR = (int) $closing->right_carry_in;
                if ($inL === (int) $closing->left_carry_out && $inR === (int) $closing->right_carry_out) {
                    continue;
                }

                echo sprintf(
                    "  closing #%d user=%d scope=%s date=%s carry_out %d|%d → %d|%d (payout=%s pairs=%d kept)\n",
                    $closing->id,
                    $user->id,
                    $scope,
                    $closing->closing_date->toDateString(),
                    $closing->left_carry_out,
                    $closing->right_carry_out,
                    $inL,
                    $inR,
                    $closing->payout_usd,
                    $closing->pairs_matched,
                );

                if (! $dry) {
                    $meta = is_array($closing->meta) ? $closing->meta : [];
                    $meta['team_display_carry_sync'] = $today->toDateString();
                    $meta['income_eligible'] = false;
                    $meta['income_blocked_reason'] = $reason;
                    $meta['pairs_held'] = min($inL, $inR);

                    $closing->update([
                        'left_carry_out' => $inL,
                        'right_carry_out' => $inR,
                        'left_lapsed' => 0,
                        'right_lapsed' => 0,
                        'meta' => $meta,
                    ]);
                }
                $stats['closings_carry_fixed']++;
            }

            $curLeft = (int) $user->{$cols['left']};
            $curRight = (int) $user->{$cols['right']};
            if (! $closingsOnly && ($curLeft !== $targetLeft || $curRight !== $targetRight)) {
                echo sprintf(
                    "  user #%d (%s) scope=%s reason=%s users.%s %d|%d → %d|%d\n",
                    $user->id,
                    $user->login_uid,
                    $scope,
                    $reason,
                    $cols['left'],
                    $curLeft,
                    $curRight,
                    $targetLeft,
                    $targetRight,
                );
                if (! $dry) {
                    $user->{$cols['left']} = $targetLeft;
                    $user->{$cols['right']} = $targetRight;
                }
                $stats['users_carry_updated']++;
            }
        }

        if (! $dry && ! $closingsOnly) {
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

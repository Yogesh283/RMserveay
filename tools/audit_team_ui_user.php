<?php

/**
 * Compare team-page totals/carry vs DB closing + lifetime legs.
 * Usage: php tools/audit_team_ui_user.php 128
 */

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Services\BinarySubtreeVolumeService;
use App\Services\MemberTeamService;
use App\Support\BinaryClosingCalendar;

$uid = (int) ($argv[1] ?? 128);
$user = User::find($uid);
if (! $user) {
    echo "User {$uid} not found\n";
    exit(1);
}

$vol = app(BinarySubtreeVolumeService::class);
$team = app(MemberTeamService::class);
$today = BinaryClosingCalendar::todayDateString();
$yest = BinaryClosingCalendar::yesterdayDateString();

$payload = $team->overview($user);
$scopes = ['active_panel' => 'Active', 'panel' => 'Sub', 'super' => 'Super'];

echo "=== User #{$uid} ({$user->login_uid}) team UI audit ===\n";
echo "Today IST: {$today}  |  Screenshot date likely: {$yest}\n\n";

foreach ($scopes as $scope => $label) {
    $lm = $payload['leg_match'][$scope] ?? [];
    $life = $vol->lifetimeLegVolumes($user, $scope);
    $closing = BinaryDailyClosing::query()
        ->where('user_id', $uid)
        ->where('scope', $scope)
        ->whereDate('closing_date', $yest)
        ->orderByDesc('id')
        ->first();

    $eligible = $user->qualifiesBinaryClosingIncome($scope);
    $blocked = $user->binaryClosingIncomeBlockedReason($scope);

    echo "--- {$label} ({$scope}) ---\n";
    echo "Eligible: ".($eligible ? 'YES' : 'NO').($blocked ? " [{$blocked}]" : '')."\n";
    echo "Lifetime legs (SQL tree SUM):  {$life['left']} | {$life['right']}\n";
    echo "UI total_left/right:          ".($lm['total_left'] ?? '?').' | '.($lm['total_right'] ?? '?')."\n";
    echo "UI current_carry (now):       ".($lm['current_carry_left'] ?? '?').' | '.($lm['current_carry_right'] ?? '?')."\n";
    echo "Stored user carry columns:    ";
    match ($scope) {
        'active_panel' => print("{$user->active_panel_match_carry_left} | {$user->active_panel_match_carry_right}\n"),
        'super' => print("{$user->super_panel_match_carry_left} | {$user->super_panel_match_carry_right}\n"),
        default => print("{$user->panel_match_carry_left} | {$user->panel_match_carry_right}\n"),
    };
    if ($closing) {
        echo "Closing {$yest}: in {$closing->left_carry_in}|{$closing->right_carry_in} → out {$closing->left_carry_out}|{$closing->right_carry_out} pairs={$closing->pairs_matched} payout={$closing->payout_usd}\n";
        $meta = is_array($closing->meta) ? $closing->meta : [];
        echo "  meta subtree_total: ".($meta['subtree_total_left'] ?? '?').'|'.($meta['subtree_total_right'] ?? '?')."\n";
    } else {
        echo "No closing row for {$yest}\n";
    }
    echo "\n";
}

<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Services\BinarySubtreeVolumeService;
use App\Support\BinaryClosingCalendar;

$uid = (int) ($argv[1] ?? 128);
$user = User::find($uid);
if (! $user) {
    echo "User {$uid} not found\n";
    exit(1);
}

$v = app(BinarySubtreeVolumeService::class);
$today = BinaryClosingCalendar::todayDateString();
$yest = BinaryClosingCalendar::yesterdayDateString();
$todayCarbon = \Carbon\CarbonImmutable::parse($today, BinaryClosingCalendar::timezone());

$life = $v->lifetimeLegVolumes($user, 'super');
$todayVol = $v->todayLegVolumes($user, 'super');
$yestVol = $v->yesterdayLegVolumes($user, 'super');
$inp = $v->closingMatchInputs($user, 'super', $todayCarbon);

$todayClosing = BinaryDailyClosing::query()
    ->where('user_id', $uid)
    ->where('scope', 'super')
    ->whereDate('closing_date', $today)
    ->orderByDesc('id')
    ->first();

echo "=== User {$uid} ({$user->login_uid}) Super Panel vs UI ===\n";
echo "Today IST: {$today}  Yesterday: {$yest}\n\n";

$rows = [
    ['UI: Total super L/R', $life['left'], $life['right']],
    ['UI: Carry in today (opening)', $inp['opening_left_out'], $inp['opening_right_out']],
    ['UI: Today new', $todayVol['left'], $todayVol['right']],
    ['Ledger left_in | right_in', $inp['left_in'], $inp['right_in']],
    ['UI: Carry forward (total_L+new_L | total_R)', $life['left'] + $todayVol['left'], $life['right']],
    ['users.super_panel_match_carry', $user->super_panel_match_carry_left, $user->super_panel_match_carry_right],
];

if ($todayClosing) {
    $rows[] = ['Today closing carry_out', $todayClosing->left_carry_out, $todayClosing->right_carry_out];
    $rows[] = ['Today closing carry_in', $todayClosing->left_carry_in, $todayClosing->right_carry_in];
}

printf("%-40s %8s %8s\n", 'Row', 'Left', 'Right');
foreach ($rows as $r) {
    printf("%-40s %8d %8d\n", $r[0], $r[1], $r[2]);
}

echo "\nEligible super income (9/9): ".($user->qualifiesForSuperSubPanelMatchingIncome() ? 'YES' : 'NO')."\n";
echo "Active panelist (\$11): ".($user->qualifiesActivePanelistIncome() ? 'YES' : 'NO')."\n";

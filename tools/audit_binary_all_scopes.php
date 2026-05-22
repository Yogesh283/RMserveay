<?php

/**
 * Audit active / sub(panel) / super closings vs team-page math.
 * Usage: php tools/audit_binary_all_scopes.php [user_id] [closing_date YYYY-MM-DD]
 */

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Services\BinarySubtreeVolumeService;
use App\Support\BinaryWeakSideLapse;
use Illuminate\Support\Carbon;

$userId = isset($argv[1]) ? (int) $argv[1] : 157;
$dateStr = $argv[2] ?? '2026-05-21';

$user = User::find($userId);
if (! $user) {
    echo "User {$userId} not found\n";
    exit(1);
}

$scopes = [
    'active_panel' => ['left' => 'active_panel_match_carry_left', 'right' => 'active_panel_match_carry_right'],
    'panel' => ['left' => 'panel_match_carry_left', 'right' => 'panel_match_carry_right'],
    'super' => ['left' => 'super_panel_match_carry_left', 'right' => 'super_panel_match_carry_right'],
];

$svc = app(BinarySubtreeVolumeService::class);
$date = Carbon::parse($dateStr, 'Asia/Kolkata');
$maxPairs = 20;
$active = $user->qualifiesActivePanelistIncome();

echo "=== User {$userId} ({$user->login_uid}) closing_date={$dateStr} ===\n";
echo 'Active panelist (income): '.($active ? 'YES' : 'NO (carry only)')."\n";
echo 'Stored carry: panel '.$user->panel_match_carry_left.'|'.$user->panel_match_carry_right
    .' active '.$user->active_panel_match_carry_left.'|'.$user->active_panel_match_carry_right
    .' super '.$user->super_panel_match_carry_left.'|'.$user->super_panel_match_carry_right."\n\n";

$issues = 0;

foreach ($scopes as $scope => $cols) {
    $inputs = $svc->closingMatchInputs($user, $scope, $date, $maxPairs);
    $leftIn = (int) $inputs['left_in'];
    $rightIn = (int) $inputs['right_in'];
    $expPairs = min(min($leftIn, $rightIn), $maxPairs);
    $expSplit = BinaryWeakSideLapse::splitFromLegCounts($leftIn, $rightIn, $maxPairs);

    $row = BinaryDailyClosing::query()
        ->where('user_id', $userId)
        ->where('scope', $scope)
        ->whereDate('closing_date', $dateStr)
        ->orderByDesc('id')
        ->first();

    echo "--- scope: {$scope} ---\n";
    echo "Expected (team math): L_in={$leftIn} R_in={$rightIn} pairs={$expPairs} carry_out L={$expSplit['left_out']} R={$expSplit['right_out']}\n";
    echo "  opening L={$inputs['opening_left_out']} R={$inputs['opening_right_out']} daily L={$inputs['yesterday_left']} R={$inputs['yesterday_right']}\n";

    if (! $row) {
        echo "  DB closing row: MISSING\n";
        if ($leftIn > 0 || $rightIn > 0) {
            $issues++;
        }
        echo "\n";
        continue;
    }

    $meta = is_array($row->meta) ? $row->meta : [];
    $eligible = (bool) ($meta['income_eligible'] ?? true);
    echo "  DB closing: L_in={$row->left_carry_in} R_in={$row->right_carry_in} pairs={$row->pairs_matched} payout={$row->payout_usd}\n";
    echo "  carry_out L={$row->left_carry_out} R={$row->right_carry_out} income_eligible=".($eligible ? '1' : '0')."\n";

    if ((int) $row->left_carry_in !== $leftIn || (int) $row->right_carry_in !== $rightIn) {
        echo "  ISSUE: carry_in mismatch vs team inputs\n";
        $issues++;
    }
    if ((int) $row->pairs_matched !== $expPairs) {
        echo "  ISSUE: pairs_matched mismatch\n";
        $issues++;
    }
    if ((int) $row->left_carry_out !== (int) $expSplit['left_out'] || (int) $row->right_carry_out !== (int) $expSplit['right_out']) {
        echo "  ISSUE: carry_out mismatch (strong-leg diff rule)\n";
        $issues++;
    }
    if (! $active && (float) $row->payout_usd > 0) {
        echo "  ISSUE: inactive but payout > 0\n";
        $issues++;
    }
    if ($active && $expPairs > 0 && (float) $row->payout_usd <= 0 && $scope === 'active_panel') {
        echo "  WARN: active + pairs but $0 payout (check milestone scope)\n";
    }

    $storedL = (int) $user->{$cols['left']};
    $storedR = (int) $user->{$cols['right']};
    if ($storedL !== (int) $row->left_carry_out || $storedR !== (int) $row->right_carry_out) {
        echo "  WARN: users.{$cols['left']}/{$cols['right']} ({$storedL}|{$storedR}) != closing carry_out — re-run closing or stale\n";
    }
    echo "\n";
}

echo $issues === 0 ? "OK — no mismatches for this user/date.\n" : "FOUND {$issues} issue(s).\n";

// DB-wide inactive payout check
$bad = \Illuminate\Support\Facades\DB::table('binary_daily_closings as b')
    ->join('users as u', 'u.id', '=', 'b.user_id')
    ->where('b.payout_usd', '>', 0)
    ->where(function ($q) {
        $q->whereNull('u.activation_fee_paid_at')
            ->orWhereNull('u.minimum_panel_fee_paid_at');
    })
    ->count();
echo "\nDB-wide: inactive users with payout_usd>0 in closings: {$bad}\n";

$dupes = \Illuminate\Support\Facades\DB::select(
    'SELECT user_id, scope, closing_date, COUNT(*) c FROM binary_daily_closings GROUP BY user_id, scope, closing_date HAVING c > 1 LIMIT 10'
);
echo 'Duplicate closing rows (sample): '.count($dupes)."\n";

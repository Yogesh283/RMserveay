<?php

/**
 * Audit one closing_date across all paid rows + common issues.
 * Usage: php tools/audit_closing_date.php 2026-05-22
 */

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\BinarySubtreeVolumeService;
use App\Support\BinaryWeakSideLapse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

$dateStr = $argv[1] ?? '2026-05-22';
$date = Carbon::parse($dateStr, 'Asia/Kolkata');
$svc = app(BinarySubtreeVolumeService::class);
$maxPairs = 20;

echo "=== Closing audit {$dateStr} (IST) ===\n\n";

$summary = BinaryDailyClosing::query()
    ->whereDate('closing_date', $dateStr)
    ->selectRaw('scope, COUNT(*) as row_count, SUM(CASE WHEN payout_usd > 0 THEN 1 ELSE 0 END) as paid, SUM(payout_usd) as total_payout')
    ->groupBy('scope')
    ->get();

echo "By scope:\n";
foreach ($summary as $s) {
    echo "  {$s->scope}: rows={$s->row_count} paid={$s->paid} total=\${$s->total_payout}\n";
}

$dupes = DB::select(
    'SELECT user_id, scope, COUNT(*) c FROM binary_daily_closings WHERE closing_date = ? GROUP BY user_id, scope HAVING c > 1',
    [$dateStr]
);
echo "\nDuplicate user+scope rows: ".count($dupes)."\n";
foreach (array_slice($dupes, 0, 10) as $d) {
    echo "  user={$d->user_id} scope={$d->scope} count={$d->c}\n";
}

$issues = [];

$rows = BinaryDailyClosing::query()
    ->whereDate('closing_date', $dateStr)
    ->orderBy('user_id')
    ->orderBy('scope')
    ->get();

foreach ($rows as $row) {
    $user = User::find($row->user_id);
    if ($user === null) {
        $issues[] = "closing #{$row->id}: missing user {$row->user_id}";
        continue;
    }

    $scope = $row->scope;
    $eligible = $user->qualifiesBinaryClosingIncome($scope);
    $inputs = $svc->closingMatchInputs($user, $scope, $date, $maxPairs);
    $leftIn = (int) $inputs['left_in'];
    $rightIn = (int) $inputs['right_in'];
    $expPairs = $eligible ? min(min($leftIn, $rightIn), $maxPairs) : 0;
    $expSplit = $eligible
        ? BinaryWeakSideLapse::splitFromLegCounts($leftIn, $rightIn, $maxPairs)
        : ['left_out' => $leftIn, 'right_out' => $rightIn, 'pairs_matched' => 0];

    $meta = is_array($row->meta) ? $row->meta : [];
    $uid = $user->login_uid;

    if ((int) $row->left_carry_in !== $leftIn || (int) $row->right_carry_in !== $rightIn) {
        $issues[] = "#{$row->id} user={$uid}({$user->id}) {$scope}: carry_in DB {$row->left_carry_in}|{$row->right_carry_in} expected {$leftIn}|{$rightIn}";
    }

    if ($eligible) {
        if ((int) $row->pairs_matched !== $expPairs) {
            $issues[] = "#{$row->id} user={$uid} {$scope}: pairs DB={$row->pairs_matched} expected={$expPairs}";
        }
        if ((float) $row->payout_usd > 0 && (int) $row->pairs_matched === 0 && $scope === 'active_panel') {
            $issues[] = "#{$row->id} user={$uid} {$scope}: payout but 0 pairs";
        }
    } else {
        if ((int) $row->pairs_matched > 0) {
            $issues[] = "#{$row->id} user={$uid} {$scope}: INELIGIBLE but pairs_matched={$row->pairs_matched} (reason: ".$user->binaryClosingIncomeBlockedReason($scope).')';
        }
        if ((float) $row->payout_usd > 0 && ! in_array($scope, ['panel', 'super'], true)) {
            // panel/super may have paid before eligibility rule — flag all ineligible payouts
        }
        if ((float) $row->payout_usd > 0 && ! $eligible) {
            $issues[] = "#{$row->id} user={$uid} {$scope}: INELIGIBLE but payout=\${$row->payout_usd}";
        }
        if ((int) $row->left_carry_out !== $leftIn || (int) $row->right_carry_out !== $rightIn) {
            $issues[] = "#{$row->id} user={$uid} {$scope}: inactive hold carry_out {$row->left_carry_out}|{$row->right_carry_out} expected full {$leftIn}|{$rightIn}";
        }
    }

    if ($eligible && ((int) $row->left_carry_out !== (int) $expSplit['left_out'] || (int) $row->right_carry_out !== (int) $expSplit['right_out'])) {
        $issues[] = "#{$row->id} user={$uid} {$scope}: carry_out DB {$row->left_carry_out}|{$row->right_carry_out} expected {$expSplit['left_out']}|{$expSplit['right_out']}";
    }

    if ((float) $row->payout_usd > 0 && empty($row->wallet_transaction_id)) {
        $issues[] = "#{$row->id} user={$uid} {$scope}: payout>0 but no wallet_transaction_id";
    }
}

echo "\n--- Paid rows detail ---\n";
foreach ($rows->where('payout_usd', '>', 0) as $r) {
    $u = User::find($r->user_id);
    echo sprintf(
        "  %s (%d) %s in=%d|%d pairs=%d \$%s out=%d|%d wallet_tx=%s\n",
        $u?->login_uid ?? '?',
        $r->user_id,
        $r->scope,
        $r->left_carry_in,
        $r->right_carry_in,
        $r->pairs_matched,
        $r->payout_usd,
        $r->left_carry_out,
        $r->right_carry_out,
        $r->wallet_transaction_id ?? 'NULL',
    );
}

echo "\n=== Issues: ".count($issues)." ===\n";
foreach (array_slice($issues, 0, 40) as $i) {
    echo "  {$i}\n";
}
if (count($issues) > 40) {
    echo '  ... and '.(count($issues) - 40)." more\n";
}

if (count($issues) === 0) {
    echo "OK — closing matches current rules for {$dateStr}.\n";
} else {
    echo "\nSome rows may be from OLD closing rules (before inactive/9-9 fix). Re-close after reverse if needed.\n";
}

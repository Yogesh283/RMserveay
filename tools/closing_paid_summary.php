<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$dates = $argv[1] ?? null;
$dates = $dates ? [$dates] : ['2026-05-20', '2026-05-21', '2026-05-22'];

foreach ($dates as $date) {
    echo "\n=== Paid closings {$date} ===\n";
    $rows = App\Models\BinaryDailyClosing::query()
        ->whereDate('closing_date', $date)
        ->where('payout_usd', '>', 0)
        ->orderBy('user_id')
        ->orderBy('scope')
        ->get(['user_id', 'scope', 'left_carry_in', 'right_carry_in', 'pairs_matched', 'payout_usd', 'left_carry_out', 'right_carry_out']);

    $total = '0.00';
    foreach ($rows as $r) {
        $u = App\Models\User::find($r->user_id);
        $uid = $u?->login_uid ?? $r->user_id;
        echo sprintf(
            "  user=%s (%d) scope=%s in=%d|%d pairs=%d payout=%s out=%d|%d\n",
            $uid,
            $r->user_id,
            $r->scope,
            $r->left_carry_in,
            $r->right_carry_in,
            $r->pairs_matched,
            $r->payout_usd,
            $r->left_carry_out,
            $r->right_carry_out,
        );
        $total = bcadd($total, (string) $r->payout_usd, 2);
    }
    echo "  TOTAL payout: {$total} ({$rows->count()} rows)\n";
}

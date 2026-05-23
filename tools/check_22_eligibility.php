<?php
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

foreach ([128, 157, 354, 8, 57] as $id) {
    $u = App\Models\User::find($id);
    if (! $u) continue;
    echo "{$id} {$u->login_uid}: sub={$u->sub_panel_count}/9 super={$u->super_sub_panel_count}/9\n";
    echo "  active_panel=".($u->qualifiesBinaryClosingIncome('active_panel')?'Y':'N');
    echo " sub=".($u->qualifiesBinaryClosingIncome('panel')?'Y':'N');
    echo " super=".($u->qualifiesBinaryClosingIncome('super')?'Y':'N')."\n";
}

echo "\nInactive payout on 2026-05-22 only:\n";
$bad = DB::table('binary_daily_closings as b')
    ->join('users as u', 'u.id', '=', 'b.user_id')
    ->whereDate('b.closing_date', '2026-05-22')
    ->where('b.payout_usd', '>', 0)
    ->get(['b.id', 'b.user_id', 'b.scope', 'b.payout_usd', 'u.sub_panel_count', 'u.super_sub_panel_count', 'u.activation_fee_paid_at', 'u.minimum_panel_fee_paid_at']);

foreach ($bad as $r) {
    $u = App\Models\User::find($r->user_id);
    $ok = $u && $u->qualifiesBinaryClosingIncome($r->scope);
    echo "  closing #{$r->id} user={$r->user_id} {$r->scope} \${$r->payout_usd} eligible=".($ok?'YES':'NO')."\n";
}

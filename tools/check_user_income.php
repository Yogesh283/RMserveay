<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$userId = (int) ($argv[1] ?? 128);
$date = $argv[2] ?? '2026-05-22';
$scope = $argv[3] ?? 'panel';

$user = App\Models\User::find($userId);
$closing = App\Models\BinaryDailyClosing::query()
    ->where('user_id', $userId)
    ->where('scope', $scope)
    ->whereDate('closing_date', $date)
    ->orderByDesc('id')
    ->first();

echo "User {$userId} ({$user->login_uid}) wallet={$user->wallet_balance}\n";
if (! $closing) {
    echo "No closing\n";
    exit(1);
}

echo "Closing id={$closing->id} payout={$closing->payout_usd} wallet_tx_id={$closing->wallet_transaction_id}\n";
echo "Meta: ".json_encode($closing->meta, JSON_PRETTY_PRINT)."\n";

$mp = App\Models\MatchingPayout::query()
    ->where('user_id', $userId)
    ->where('scope', $scope)
    ->whereDate('closing_date', $date)
    ->get();

echo "MatchingPayout rows: ".$mp->count()."\n";
foreach ($mp as $p) {
    echo "  id={$p->id} amount={$p->amount_usd} wallet_tx={$p->wallet_transaction_id}\n";
}

$txs = App\Models\WalletTransaction::query()
    ->where('user_id', $userId)
    ->whereDate('created_at', '>=', $date)
    ->orderByDesc('id')
    ->limit(10)
    ->get(['id', 'type', 'amount', 'balance_after', 'created_at', 'meta']);

echo "Recent wallet txs:\n";
foreach ($txs as $t) {
    $meta = is_array($t->meta) ? json_encode($t->meta) : '';
    echo "  #{$t->id} {$t->type} amt={$t->amount} bal={$t->balance_after} at={$t->created_at} meta={$meta}\n";
}

$subTx = App\Models\WalletTransaction::query()
    ->where('user_id', $userId)
    ->where('type', App\Models\WalletTransaction::TYPE_SUB_PANEL_MATCHING)
    ->where('meta->closing_date', $date)
    ->get();

echo "SUB_PANEL_MATCHING for {$date}: ".$subTx->count()."\n";
foreach ($subTx as $t) {
    echo "  #{$t->id} amt={$t->amount}\n";
}

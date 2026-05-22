<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$userId = (int) ($argv[1] ?? 157);
$scope = $argv[2] ?? 'panel';
$date = $argv[3] ?? '2026-05-21';

$c = App\Models\BinaryDailyClosing::query()
    ->where('user_id', $userId)
    ->where('scope', $scope)
    ->whereDate('closing_date', $date)
    ->orderByDesc('id')
    ->first();

if (! $c) {
    echo "no closing\n";
    exit(1);
}

echo json_encode([
    'in' => "{$c->left_carry_in}|{$c->right_carry_in}",
    'out' => "{$c->left_carry_out}|{$c->right_carry_out}",
    'lapsed' => "{$c->left_lapsed}|{$c->right_lapsed}",
    'pairs' => $c->pairs_matched,
    'payout' => $c->payout_usd,
    'weak' => App\Support\BinaryWeakSideLapse::fromClosing($c),
], JSON_PRETTY_PRINT)."\n";

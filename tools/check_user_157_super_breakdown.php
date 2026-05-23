<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Services\BinarySubtreeVolumeService;

$uid = (int) ($argv[1] ?? 157);
$user = User::find($uid);
if (! $user) {
    exit("User not found\n");
}

$v = app(BinarySubtreeVolumeService::class);

foreach (['left', 'right'] as $leg) {
    $startId = $leg === 'left' ? $user->left_child_id : $user->right_child_id;
    $ids = $v->collectBinarySubtreeIds($startId !== null ? (int) $startId : null);
    $rows = User::query()
        ->whereIn('id', $ids)
        ->where('super_sub_panel_count', '>', 0)
        ->orderBy('id')
        ->get(['id', 'login_uid', 'super_sub_panel_count', 'binary_side']);

    $sum = (int) $rows->sum('super_sub_panel_count');
    echo "\n=== {$leg} leg (start child {$startId}) super_sub_panel_count sum = {$sum} ===\n";
    foreach ($rows as $r) {
        echo "  #{$r->id} {$r->login_uid} super={$r->super_sub_panel_count} side={$r->binary_side}\n";
    }
}

$life = $v->lifetimeLegVolumes($user, 'super');
echo "\nApp lifetimeLegVolumes: L={$life['left']} R={$life['right']}\n";
echo "User 157: super_slots={$user->super_sub_panel_count} carry={$user->super_panel_match_carry_left}|{$user->super_panel_match_carry_right}\n";

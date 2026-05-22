<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$userId = (int) ($argv[1] ?? 128);
$user = App\Models\User::find($userId);

$svc = app(App\Services\MemberTeamService::class);
$ref = new ReflectionMethod($svc, 'buildTeamLegMatch');
$ref->setAccessible(true);
$left = $svc->aggregateLeg($user, 'left');
$right = $svc->aggregateLeg($user, 'right');

echo "User {$userId} ({$user->login_uid})\n";
echo "Stored active carry: {$user->active_panel_match_carry_left}|{$user->active_panel_match_carry_right}\n\n";

echo "Leg aggregate (sponsor tree stats in legs API):\n";
echo json_encode(['left' => $left, 'right' => $right], JSON_PRETTY_PRINT)."\n\n";

$active = $ref->invoke($svc, $user, App\Models\BinaryDailyClosing::SCOPE_ACTIVE_PANEL, $left, $right);
echo "leg_match.active_panel (team UI):\n";
echo json_encode($active, JSON_PRETTY_PRINT)."\n\n";

foreach (['2026-05-20', '2026-05-21', '2026-05-22'] as $d) {
    $c = App\Models\BinaryDailyClosing::query()
        ->where('user_id', $userId)
        ->where('scope', 'active_panel')
        ->whereDate('closing_date', $d)
        ->orderByDesc('id')
        ->first();
    if ($c) {
        echo "Closing {$d}: in={$c->left_carry_in}|{$c->right_carry_in} pairs={$c->pairs_matched} pay={$c->payout_usd} out={$c->left_carry_out}|{$c->right_carry_out}\n";
    }
}

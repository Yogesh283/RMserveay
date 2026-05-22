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
$panel = $ref->invoke($svc, $user, App\Models\BinaryDailyClosing::SCOPE_PANEL, $left, $right);
echo json_encode($panel, JSON_PRETTY_PRINT)."\n";

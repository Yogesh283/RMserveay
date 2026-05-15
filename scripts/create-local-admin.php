<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$email = $argv[1] ?? 'admin@local.test';
$loginUid = $argv[2] ?? 'admin001';
$password = $argv[3] ?? 'password';
$name = $argv[4] ?? 'Local Admin';

$user = User::query()
    ->where('login_uid', $loginUid)
    ->orWhere('email', $email)
    ->first();

$attributes = [
    'name' => $name,
    'email' => $email,
    'login_uid' => $loginUid,
    'password' => Hash::make($password),
    'email_verified_at' => now(),
];

if ($user) {
    $user->update($attributes);
    $action = 'Updated';
} else {
    $user = User::create($attributes);
    $action = 'Created';
}

echo "{$action} admin user #{$user->id}\n";
echo "Email: {$email}\n";
echo "Login UID: {$loginUid}\n";
echo "Password: {$password}\n";
echo "Panel: ".config('app.url')."/kxyz\n";

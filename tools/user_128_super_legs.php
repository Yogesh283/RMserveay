<?php

declare(strict_types=1);

$dump = file_get_contents(dirname(__DIR__) . '/Ram (17).sql');
$start = strpos($dump, 'INSERT INTO `users`');
$end = strpos($dump, 'INSERT INTO `wallet_transactions`', $start);
$chunk = substr($dump, $start, $end - $start);

$users = [];
foreach (preg_split('/\r?\n/', $chunk) as $line) {
    if (! preg_match('/^\((\d+),/', $line, $idm)) {
        continue;
    }
    $id = (int) $idm[1];
    if (! preg_match(
        "/, (\d+), (\d+), '(left|right)', (\d+|NULL), (\d+|NULL), [\d.]+,/",
        $line,
        $bm,
    )) {
        continue;
    }
    if (! preg_match(
        '/, (\d+), (\d+), 0, (\d+), (\d+), (\d+), (\d+), NULL, 0, 0, 0, (\d+), (\d+), NULL/',
        $line,
        $cm,
    )) {
        continue;
    }
    $users[$id] = [
        'left' => $bm[4] === 'NULL' ? 0 : (int) $bm[4],
        'right' => $bm[5] === 'NULL' ? 0 : (int) $bm[5],
        'super' => (int) $cm[2],
        'super_carry_l' => (int) $cm[7],
        'super_carry_r' => (int) $cm[8],
    ];
}

function subtreeSuper(array $users, int $startChildId): int
{
    if ($startChildId <= 0) {
        return 0;
    }
    $sum = 0;
    $queue = [$startChildId];
    $seen = [];
    while ($queue !== []) {
        $id = array_shift($queue);
        if (isset($seen[$id])) {
            continue;
        }
        $seen[$id] = true;
        $u = $users[$id] ?? null;
        if ($u === null) {
            continue;
        }
        $sum += $u['super'];
        if ($u['left'] > 0) {
            $queue[] = $u['left'];
        }
        if ($u['right'] > 0) {
            $queue[] = $u['right'];
        }
    }

    return $sum;
}

$uid = 128;
$u = $users[$uid] ?? null;
if ($u === null) {
    echo "User 128 not found. Parsed users: " . count($users) . "\n";
    exit(1);
}

$left = subtreeSuper($users, $u['left']);
$right = subtreeSuper($users, $u['right']);

echo json_encode([
    'user_id' => 128,
    'own_super_slots' => $u['super'],
    'left_child_id' => $u['left'],
    'right_child_id' => $u['right'],
    'team_super_left_total' => $left,
    'team_super_right_total' => $right,
    'ui_total_carry_if_full_match' => max(0, $right - $left),
    'stored_super_carry' => $u['super_carry_l'] . '|' . $u['super_carry_r'],
    'parsed_users' => count($users),
], JSON_PRETTY_PRINT) . "\n";

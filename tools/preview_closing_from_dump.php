<?php

/**
 * Simulate binary:preview-closing for a date from Ram (*.sql) dump.
 * Usage: php tools/preview_closing_from_dump.php 2026-05-22
 */

declare(strict_types=1);

$date = $argv[1] ?? '2026-05-22';
$dumpPath = dirname(__DIR__) . '/Ram (19).sql';

if (! is_file($dumpPath)) {
    fwrite(STDERR, "Missing: {$dumpPath}\n");
    exit(1);
}

$sql = file_get_contents($dumpPath);
if ($sql === false) {
    exit(1);
}

/** @var array<int, array{id:int,binary_parent_id:?int,binary_side:?string,login_uid:string,active:bool,sub9:bool,super9:bool}> */
$users = [];

$start = strpos($sql, 'INSERT INTO `users`');
$end = strpos($sql, 'INSERT INTO `wallet_transactions`');
$chunk = ($start !== false && $end !== false) ? substr($sql, $start, $end - $start) : '';

if (preg_match_all(
    "/^\((\d+), '[^']*', '[^']*', '([^']+)'.*?'RMS[A-Z0-9]+', (\d+), (\d+), '(left|right)'/m",
    $chunk,
    $m,
    PREG_SET_ORDER,
)) {
    foreach ($m as $x) {
        $id = (int) $x[1];
        $users[$id] = [
            'id' => $id,
            'login_uid' => $x[2],
            'sponsor_id' => (int) $x[3],
            'binary_parent_id' => (int) $x[4],
            'binary_side' => $x[5],
            'active' => false,
            'sub9' => false,
            'super9' => false,
        ];
    }
}

// activation + sub/super counts from user rows (sub_panel_count position)
if (preg_match_all(
    '/^\((\d+), \'[^\']*\', \'[^\']*\', \'([^\']+)\'[^)]*?, (\d+), (\d+), (\d+), (\d+), [^,]*, [^,]*, [^,]*, [^,]*, [^,]*, [^,]*, \'([^\']+|NULL)\', \'([^\']+|NULL)\', (\d+), (\d+),/m',
    $chunk,
    $u2,
    PREG_SET_ORDER,
)) {
    foreach ($u2 as $x) {
        $id = (int) $x[1];
        if (! isset($users[$id])) {
            continue;
        }
        $users[$id]['login_uid'] = $x[2];
        $users[$id]['active'] = $x[6] !== 'NULL' && $x[7] !== 'NULL';
        $users[$id]['sub9'] = (int) $x[8] >= 9;
        $users[$id]['super9'] = (int) $x[9] >= 9;
    }
}

$scopes = [
    'active_panel' => 'minimum_panel_fee',
    'panel' => 'sub_panel_fee',
    'super' => 'super_sub_panel_fee',
];

/** @var array<string, array<int, array{left:int,right:int}>> */
$increments = [];

foreach ($scopes as $scope => $type) {
    $increments[$scope] = [];
    if (! preg_match_all(
        "/^\(\d+, (\d+), '{$type}', .+?, '{$date} /m",
        $sql,
        $tx,
    )) {
        continue;
    }
    foreach ($tx[1] as $buyerId) {
        $buyerId = (int) $buyerId;
        $u = $users[$buyerId] ?? null;
        if ($u === null || $u['binary_parent_id'] === null || ! in_array($u['binary_side'], ['left', 'right'], true)) {
            continue;
        }
        $childSide = $u['binary_side'];
        $parentId = $u['binary_parent_id'];
        for ($d = 0; $d < 100000; $d++) {
            if ($parentId === null) {
                break;
            }
            $increments[$scope][$parentId] ??= ['left' => 0, 'right' => 0];
            $increments[$scope][$parentId][$childSide]++;
            $p = $users[$parentId] ?? null;
            if ($p === null || $p['binary_parent_id'] === null) {
                break;
            }
            $childSide = $p['binary_side'] ?? '';
            $parentId = $p['binary_parent_id'];
            if (! in_array($childSide, ['left', 'right'], true)) {
                break;
            }
        }
    }
}

echo "=== Preview closing from dump ===\n";
echo "closing_date: {$date}\n";
echo "dump: Ram (19).sql\n\n";

$grandTotal = 0.0;
$totalPaidUsers = 0;

foreach ($scopes as $scope => $type) {
    $txCount = 0;
    if (preg_match_all("/^\(\d+, (\d+), '{$type}', .+?, '{$date} /m", $sql, $m)) {
        $txCount = count($m[0]);
    }

    $eligible = [];
    foreach ($increments[$scope] ?? [] as $uid => $s) {
        $l = (int) $s['left'];
        $r = (int) $s['right'];
        if ($l > 0 && $r > 0) {
            $pairs = min($l, $r, 20);
            $u = $users[$uid] ?? null;
            $active = $u['active'] ?? false;
            $subOk = $scope !== 'panel' || ($u['sub9'] ?? false);
            $superOk = $scope !== 'super' || ($u['super9'] ?? false);
            $perPair = $scope === 'active_panel' ? 1.0 : 0.0;
            $milestone = 0.0;
            if ($scope === 'panel' && $active && $subOk) {
                $milestones = [0, 2, 4, 6, 8];
                $hit = 0;
                foreach ($milestones as $m) {
                    if ($pairs >= $m) {
                        $hit = $m;
                    }
                }
                $milestone = (float) $hit;
            }
            if ($scope === 'super' && $active && $superOk) {
                $milestones = [0, 2, 4, 6, 8];
                $hit = 0;
                foreach ($milestones as $m) {
                    if ($pairs >= $m) {
                        $hit = $m;
                    }
                }
                $milestone = (float) $hit * 10.0;
            }
            $payout = $active ? ($pairs * $perPair + $milestone) : 0.0;
            $eligible[] = [
                'user_id' => $uid,
                'login' => $u['login_uid'] ?? (string) $uid,
                'daily_L' => $l,
                'daily_R' => $r,
                'pairs' => $pairs,
                'payout' => $payout,
                'active' => $active,
                'slots_ok' => $subOk && $superOk || $scope === 'active_panel',
            ];
            if ($payout > 0) {
                $grandTotal += $payout;
                $totalPaidUsers++;
            }
        }
    }

    usort($eligible, fn ($a, $b) => $b['payout'] <=> $a['payout']);

    echo "--- scope={$scope}  purchases={$txCount} ---\n";
    echo 'ancestors with BOTH legs: ' . count($eligible) . "\n";

    if ($eligible === []) {
        $one = [];
        foreach ($increments[$scope] ?? [] as $uid => $s) {
            if ($s['left'] > 0 || $s['right'] > 0) {
                $one[] = [$uid, $users[$uid]['login_uid'] ?? $uid, $s['left'], $s['right']];
            }
        }
        usort($one, fn ($a, $b) => ($b[2] + $b[3]) <=> ($a[2] + $a[3]));
        echo "top one-sided (sample):\n";
        foreach (array_slice($one, 0, 8) as $row) {
            echo "  user {$row[0]} ({$row[1]})  L={$row[2]} R={$row[3]}\n";
        }
    } else {
        echo "income recipients (active + slots ok):\n";
        foreach ($eligible as $row) {
            $flag = $row['payout'] > 0 ? 'PAID' : 'carry-only';
            echo sprintf(
                "  [%s] user %d (%s)  daily %d|%d  pairs=%d  payout=\$%.2f  active=%s\n",
                $flag,
                $row['user_id'],
                $row['login'],
                $row['daily_L'],
                $row['daily_R'],
                $row['pairs'],
                $row['payout'],
                $row['active'] ? 'yes' : 'no',
            );
        }
    }
    echo "\n";
}

echo "=== TOTAL estimated matching payout on {$date} ===\n";
echo 'paid_users: ' . $totalPaidUsers . "\n";
echo 'total_usd: $' . number_format($grandTotal, 2) . "\n";

// buyers on date
echo "\n=== Buyers on {$date} ===\n";
foreach ([158 => 'super x9', 161 => 'sub x9'] as $bid => $label) {
    $u = $users[$bid] ?? null;
    if ($u) {
        echo "  buyer {$bid} ({$u['login_uid']}) binary_parent={$u['binary_parent_id']} binary_side={$u['binary_side']} — {$label}\n";
    }
}

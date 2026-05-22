<?php

/**
 * Parse Ram (17).sql live dump → audit report (closings, carries, purchases, problems).
 * Usage: php tools/audit_live_dump.php
 */

declare(strict_types=1);

$dumpPath = dirname(__DIR__) . '/Ram (17).sql';
$outDir = dirname(__DIR__) . '/tools/sql';
$outCsv = $outDir . '/live_dump_audit_closings.csv';
$outSummary = $outDir . '/live_dump_audit_summary.md';
$outProblems = $outDir . '/live_dump_audit_problems.csv';

if (! is_file($dumpPath)) {
    fwrite(STDERR, "Missing dump: {$dumpPath}\n");
    exit(1);
}

require dirname(__DIR__) . '/vendor/autoload.php';

use App\Support\BinaryWeakSideLapse;

function splitFromLegCounts(int $leftIn, int $rightIn, int $maxPairs = 20): array
{
    return BinaryWeakSideLapse::splitFromLegCounts($leftIn, $rightIn, $maxPairs);
}

/** @return list<array<string, mixed>> */
function parseClosingsFromDump(string $sql): array
{
    $re = '/^\((\d+), (\d+), \'(\d{4}-\d{2}-\d{2})\', \'(active_panel|panel|super)\', '
        . '(\d+), (\d+), (\d+), (\d+), [\d.]+, ([\d.]+), [\d.]+, (\d+), (\d+), (\d+), (\d+),/m';

    if (! preg_match_all($re, $sql, $m, PREG_SET_ORDER)) {
        return [];
    }

    $rows = [];
    foreach ($m as $x) {
        $rows[] = [
            'id' => (int) $x[1],
            'user_id' => (int) $x[2],
            'closing_date' => $x[3],
            'scope' => $x[4],
            'left_carry_in' => (int) $x[5],
            'right_carry_in' => (int) $x[6],
            'pairs_matched' => (int) $x[7],
            'cap_hit' => (int) $x[8],
            'payout_usd' => (float) $x[9],
            'left_carry_out' => (int) $x[10],
            'right_carry_out' => (int) $x[11],
            'left_lapsed' => (int) $x[12],
            'right_lapsed' => (int) $x[13],
        ];
    }

    return $rows;
}

/** @return array<int, array<string, mixed>> */
function parseUsersCarriesFromDump(string $sql): array
{
    // users tuple: id at start; carries at fixed positions in INSERT column list
    $re = '/^\((\d+), \'[^\']*\', \'[^\']*@/, \'([A-Z0-9]+)\'/m';
    // Simpler: match id + login_uid + carry block near end before remember_token
    $re2 = '/^\((\d+), [^,]+, [^,]+, \'([A-Z0-9]+)\'.*?'
        . 'panel_match_carry_left\', `panel_match_carry_right\', `active_panel_match_carry_left\', `active_panel_match_carry_right\'.*?\)/s';

    $users = [];
    if (! preg_match_all(
        '/^\((\d+), .*?\'([A-Z0-9]+)\'.*?(\d+), (\d+), (\d+), (\d+), .*?(\d+), (\d+),/m',
        $sql,
        $m,
        PREG_SET_ORDER,
    )) {
        // Fallback: lines with super_panel_match_carry pattern in users section only
        $start = strpos($sql, 'INSERT INTO `users`');
        $end = strpos($sql, 'INSERT INTO `wallet_transactions`');
        $chunk = $start !== false && $end !== false ? substr($sql, $start, $end - $start) : $sql;

        if (preg_match_all(
            '/^\((\d+), \'[^\']*\', \'[^\']*\', \'([A-Z0-9]+)\'[^)]*?, (\d+), (\d+), (\d+), (\d+), [^,]*, [^,]*, [^,]*, [^,]*, [^,]*, [^,]*, [^,]*, [^,]*, [^,]*, [^,]*, [^,]*, [^,]*, [^,]*, (\d+), (\d+),/m',
            $chunk,
            $u,
            PREG_SET_ORDER,
        )) {
            foreach ($u as $x) {
                $users[(int) $x[1]] = [
                    'id' => (int) $x[1],
                    'login_uid' => $x[2],
                    'sub_panel_count' => (int) $x[3],
                    'super_sub_panel_count' => (int) $x[4],
                    'panel_match_carry_left' => (int) $x[5],
                    'panel_match_carry_right' => (int) $x[6],
                    'active_panel_match_carry_left' => (int) $x[7],
                    'active_panel_match_carry_right' => (int) $x[8],
                    'super_panel_match_carry_left' => (int) $x[9],
                    'super_panel_match_carry_right' => (int) $x[10],
                ];
            }
        }

        return $users;
    }

    return $users;
}

/** @return array<int, array<string, int>> */
function parseWalletCounts(string $sql): array
{
    $types = [
        'sub_panel_fee',
        'super_sub_panel_fee',
        'panel_matching',
        'super_sub_panel_matching',
        'active_panel_matching',
    ];
    $counts = [];
    foreach ($types as $type) {
        if (preg_match_all(
            "/^\(\d+, (\d+), '{$type}',/m",
            $sql,
            $m,
        )) {
            foreach ($m[1] as $uid) {
                $uid = (int) $uid;
                $counts[$uid][$type] = ($counts[$uid][$type] ?? 0) + 1;
            }
        }
    }

    return $counts;
}

echo "Reading dump...\n";
$sql = file_get_contents($dumpPath);
if ($sql === false) {
    exit(1);
}

$closings = parseClosingsFromDump($sql);
$users = parseUsersCarriesFromDump($sql);
$walletCounts = parseWalletCounts($sql);

echo 'Closings: ' . count($closings) . "\n";
echo 'Users (parsed carries): ' . count($users) . "\n";
echo 'Users with wallet activity: ' . count($walletCounts) . "\n";

$userById = $users;

// Group closings
/** @var array<string, list<array>> */
$byUserScopeDate = [];
foreach ($closings as $c) {
    $key = $c['user_id'] . '|' . $c['scope'] . '|' . $c['closing_date'];
    $byUserScopeDate[$key][] = $c;
}

$problemRows = [];
$csvRows = [];

foreach ($closings as $c) {
    $uid = (int) $c['user_id'];
    $scope = (string) $c['scope'];
    $lin = (int) $c['left_carry_in'];
    $rin = (int) $c['right_carry_in'];
    $pairs = (int) $c['pairs_matched'];
    $lout = (int) $c['left_carry_out'];
    $rout = (int) $c['right_carry_out'];
    $payout = (float) $c['payout_usd'];

    $exp = splitFromLegCounts($lin, $rin, 20);
    $mathOk = $lout === $exp['left_out'] && $rout === $exp['right_out'];
    $pairsOk = $pairs === $exp['pairs_matched'];

    $dupKey = $uid . '|' . $scope . '|' . $c['closing_date'];
    $dupCount = count($byUserScopeDate[$dupKey] ?? []);

    $u = $userById[$uid] ?? null;
    $login = $u ? (string) ($u['login_uid'] ?? $uid) : (string) $uid;

    $carryCols = match ($scope) {
        'super' => ['super_panel_match_carry_left', 'super_panel_match_carry_right'],
        'panel' => ['panel_match_carry_left', 'panel_match_carry_right'],
        'active_panel' => ['active_panel_match_carry_left', 'active_panel_match_carry_right'],
        default => [null, null],
    };

    $csvRows[] = [
        $c['id'],
        $uid,
        $login,
        $scope,
        $c['closing_date'],
        "{$lin}|{$rin}",
        $pairs,
        "{$lout}|{$rout}",
        $payout,
        $mathOk ? 'OK' : 'MATH_WRONG',
        $dupCount > 1 ? "DUP_x{$dupCount}" : 'OK',
    ];

    if (! $mathOk || ! $pairsOk) {
        $problemRows[] = [
            'MATH_MISMATCH',
            $uid,
            $login,
            $scope,
            $c['closing_date'],
            $c['id'],
            "in {$lin}|{$rin} out {$lout}|{$rout} pairs {$pairs}",
            "expected out {$exp['left_out']}|{$exp['right_out']} pairs {$exp['pairs_matched']}",
        ];
    }
}

// Duplicates summary
foreach ($byUserScopeDate as $key => $list) {
    if (count($list) <= 1) {
        continue;
    }
    [$uid, $scope, $date] = explode('|', $key, 3);
    $u = $userById[(int) $uid] ?? null;
    $login = $u ? (string) ($u['login_uid'] ?? $uid) : $uid;
    $ids = implode(',', array_column($list, 'id'));
    $payouts = implode(',', array_map(fn ($r) => (string) $r['payout_usd'], $list));
    $problemRows[] = [
        'DUPLICATE_CLOSING',
        (int) $uid,
        $login,
        $scope,
        $date,
        $ids,
        count($list) . ' rows payouts: ' . $payouts,
    ];
}

// users carry vs last closing out
/** @var array<string, array> */
$lastClosingOut = [];
foreach ($closings as $c) {
    $k = $c['user_id'] . '|' . $c['scope'];
    if (! isset($lastClosingOut[$k]) || $c['closing_date'] > $lastClosingOut[$k]['closing_date']
        || ($c['closing_date'] === $lastClosingOut[$k]['closing_date'] && $c['id'] > $lastClosingOut[$k]['id'])) {
        $lastClosingOut[$k] = $c;
    }
}

foreach ($lastClosingOut as $key => $c) {
    [$uid, $scope] = explode('|', $key, 2);
    $uid = (int) $uid;
    $u = $userById[$uid] ?? null;
    if ($u === null) {
        continue;
    }
    $cols = match ($scope) {
        'super' => ['super_panel_match_carry_left', 'super_panel_match_carry_right'],
        'panel' => ['panel_match_carry_left', 'panel_match_carry_right'],
        'active_panel' => ['active_panel_match_carry_left', 'active_panel_match_carry_right'],
        default => null,
    };
    if ($cols === null) {
        continue;
    }
    $storedL = (int) $u[$cols[0]];
    $storedR = (int) $u[$cols[1]];
    $outL = (int) $c['left_carry_out'];
    $outR = (int) $c['right_carry_out'];
    if ($storedL !== $outL || $storedR !== $outR) {
        $login = (string) ($u['login_uid'] ?? $uid);
        $problemRows[] = [
            'CARRY_MISMATCH',
            $uid,
            $login,
            $scope,
            $c['closing_date'],
            "users {$storedL}|{$storedR}",
            "last closing out {$outL}|{$outR} id {$c['id']}",
        ];
    }
}

// Per-user summary for users with any closing or carry
$scopes = ['active_panel', 'panel', 'super'];
$userSummary = [];

// Also include users only in closings
foreach ($closings as $c) {
    $uid = (int) $c['user_id'];
    if (! isset($userById[$uid])) {
        $userById[$uid] = [
            'id' => $uid,
            'login_uid' => (string) $uid,
            'sub_panel_count' => 0,
            'super_sub_panel_count' => 0,
            'panel_match_carry_left' => 0,
            'panel_match_carry_right' => 0,
            'active_panel_match_carry_left' => 0,
            'active_panel_match_carry_right' => 0,
            'super_panel_match_carry_left' => 0,
            'super_panel_match_carry_right' => 0,
        ];
    }
}

foreach ($userById as $uid => $u) {
    $login = (string) ($u['login_uid'] ?? $uid);
    $hasAny = false;
    $wc = $walletCounts[$uid] ?? [];
    $line = [
        'user_id' => $uid,
        'login_uid' => $login,
        'sub_bought' => $wc['sub_panel_fee'] ?? 0,
        'super_bought' => $wc['super_sub_panel_fee'] ?? 0,
        'panel_carry' => ((int) $u['panel_match_carry_left']) . '|' . ((int) $u['panel_match_carry_right']),
        'super_carry' => ((int) $u['super_panel_match_carry_left']) . '|' . ((int) $u['super_panel_match_carry_right']),
        'active_carry' => ((int) $u['active_panel_match_carry_left']) . '|' . ((int) $u['active_panel_match_carry_right']),
        'sub_slots' => (int) $u['sub_panel_count'],
        'super_slots' => (int) $u['super_sub_panel_count'],
        'closing_rows' => 0,
        'paid_closing_usd' => 0.0,
        'problems' => 0,
    ];

    foreach ($closings as $c) {
        if ((int) $c['user_id'] !== $uid) {
            continue;
        }
        $line['closing_rows']++;
        $line['paid_closing_usd'] += (float) $c['payout_usd'];
        $hasAny = true;
    }

    foreach ($problemRows as $p) {
        if ((int) $p[1] === $uid) {
            $line['problems']++;
            $hasAny = true;
        }
    }

    if ($hasAny
        || $line['sub_bought'] > 0
        || $line['super_bought'] > 0
        || $line['panel_carry'] !== '0|0'
        || $line['super_carry'] !== '0|0'
        || $line['active_carry'] !== '0|0') {
        $userSummary[$uid] = $line;
    }
}

// Write CSV closings
$fh = fopen($outCsv, 'w');
fputcsv($fh, ['closing_id', 'user_id', 'login_uid', 'scope', 'date', 'carry_in', 'pairs', 'carry_out', 'payout', 'math', 'dup']);
foreach ($csvRows as $r) {
    fputcsv($fh, $r);
}
fclose($fh);

$fh = fopen($outProblems, 'w');
fputcsv($fh, ['problem', 'user_id', 'login_uid', 'scope', 'date', 'detail', 'expected']);
foreach ($problemRows as $r) {
    fputcsv($fh, $r);
}
fclose($fh);

// Summary markdown
$dupUsers = [];
$mathUsers = [];
$carryUsers = [];
foreach ($problemRows as $p) {
    $k = $p[1] . '|' . $p[3];
    match ($p[0]) {
        'DUPLICATE_CLOSING' => $dupUsers[$k] = true,
        'MATH_MISMATCH' => $mathUsers[$k] = true,
        'CARRY_MISMATCH' => $carryUsers[$k] = true,
        default => null,
    };
}

$byScope = [];
foreach ($closings as $c) {
    $byScope[$c['scope']] = ($byScope[$c['scope']] ?? 0) + 1;
}

$user128 = array_filter($closings, fn ($c) => (int) $c['user_id'] === 128 && $c['scope'] === 'super');
usort($user128, fn ($a, $b) => [$a['closing_date'], $a['id']] <=> [$b['closing_date'], $b['id']]);

$md = "# Live dump audit — Ram (17).sql\n\n";
$md .= 'Generated: ' . date('Y-m-d H:i:s') . "\n\n";
$md .= "## Totals\n\n";
$md .= "| Item | Count |\n|------|------:|\n";
$md .= '| Users in dump | ' . count($users) . " |\n";
$md .= '| binary_daily_closings rows | ' . count($closings) . " |\n";
$md .= '| Users with wallet tx | ' . count($walletCounts) . " |\n";
foreach ($byScope as $s => $n) {
    $md .= "| closings scope `{$s}` | {$n} |\n";
}
$md .= '| Users with activity (summary) | ' . count($userSummary) . " |\n";
$md .= '| Problem rows | ' . count($problemRows) . " |\n";
$md .= '| DUPLICATE_CLOSING cases | ' . count($dupUsers) . " |\n";
$md .= '| MATH_MISMATCH rows | ' . count(array_filter($problemRows, fn ($p) => $p[0] === 'MATH_MISMATCH')) . " |\n";
$md .= '| CARRY_MISMATCH (users vs last closing) | ' . count($carryUsers) . " |\n\n";

$md .= "## Files\n\n";
$md .= "- `tools/sql/live_dump_audit_closings.csv` — har closing row\n";
$md .= "- `tools/sql/live_dump_audit_problems.csv` — sirf problems\n";
$md .= "- `tools/sql/live_dump_audit_users.csv` — per user buy/carry/closing\n\n";

$md .= "## User 128 — super closings (live dump)\n\n";
$md .= "| id | date | in | pairs | out | payout | math |\n";
$md .= "|---:|---|---|---:|---|---:|:---:|\n";
foreach ($user128 as $c) {
    $exp = splitFromLegCounts((int) $c['left_carry_in'], (int) $c['right_carry_in'], 20);
    $ok = (int) $c['left_carry_out'] === $exp['left_out'] && (int) $c['right_carry_out'] === $exp['right_out'];
    $md .= sprintf(
        "| %s | %s | %d\\|%d | %d | %d\\|%d | %s | %s |\n",
        $c['id'],
        $c['closing_date'],
        $c['left_carry_in'],
        $c['right_carry_in'],
        $c['pairs_matched'],
        $c['left_carry_out'],
        $c['right_carry_out'],
        $c['payout_usd'],
        $ok ? 'OK' : 'WRONG',
    );
}
$u128 = $userById[128] ?? null;
if ($u128) {
    $md .= "\n**users.super carry now:** {$u128['super_panel_match_carry_left']}|{$u128['super_panel_match_carry_right']}\n";
    $md .= "\n**super_sub_panel_count (own slots):** {$u128['super_sub_panel_count']}\n";
}

$md .= "\n## Top problems (first 40)\n\n";
$md .= "| problem | user | scope | date | detail |\n";
$md .= "|---------|-----:|-------|------|--------|\n";
$n = 0;
foreach ($problemRows as $p) {
    if ($n++ >= 40) {
        break;
    }
    $md .= '| ' . implode(' | ', array_map(fn ($x) => str_replace('|', '\\|', (string) $x), $p)) . " |\n";
}

file_put_contents($outSummary, $md);

$fh = fopen($outDir . '/live_dump_audit_users.csv', 'w');
fputcsv($fh, array_keys(reset($userSummary) ?: []));
foreach ($userSummary as $line) {
    fputcsv($fh, $line);
}
fclose($fh);

echo "Wrote:\n  {$outCsv}\n  {$outProblems}\n  {$outDir}/live_dump_audit_users.csv\n  {$outSummary}\n";
echo 'Problems: ' . count($problemRows) . "\n";

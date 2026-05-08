<?php

namespace App\Services;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Models\WalletTransaction;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Binary 1:1 daily closing.
 *
 *  Rule 1: 1 Left + 1 Right = 1 Pair.
 *  Rule 2: Both legs must have at least 1 point to form a pair.
 *  Rule 3: Closing time defaults to 00:00 IST (configurable in `binary_closing.php`).
 *  Rule 4–5: Capped at `max_pairs_per_day` (default 20).
 *  Rule 6: Matched pairs deducted from BOTH legs.
 *  Rule 7: Higher leg's leftover carries forward.
 *  Rule 8: Lower leg's leftover lapses to 0.
 *  Rule 9: Wallet auto-credited per closing (one transaction per user × scope).
 *  Rule 10: Every closing produces a `BinaryDailyClosing` audit row.
 *  Rule 11: Driven by the `binary:daily-closing` artisan command (cron-scheduled).
 *  Rule 12: Pair income / daily cap configurable per scope.
 */
class BinaryDailyClosingService
{
    /**
     * Run the closing for every user that has any non-zero carry, across every enabled scope.
     *
     * @return array{
     *     processed: int,
     *     paid_users: int,
     *     pairs_matched: int,
     *     payout_usd: string,
     *     scopes: array<string, array{processed:int,paid_users:int,pairs_matched:int,payout_usd:string}>,
     *     closing_date: string,
     * }
     */
    public function closeAll(?CarbonInterface $closingDate = null): array
    {
        $tz = $this->timezone();
        $date = $this->resolveClosingDate($closingDate);

        $totals = [
            'processed' => 0,
            'paid_users' => 0,
            'pairs_matched' => 0,
            'payout_usd' => '0.00',
            'scopes' => [],
            'closing_date' => $date->toDateString(),
        ];

        foreach ($this->enabledScopes() as $scope => $cfg) {
            $scopeTotals = $this->closeScope($scope, $cfg, $date);

            $totals['processed'] += $scopeTotals['processed'];
            $totals['paid_users'] += $scopeTotals['paid_users'];
            $totals['pairs_matched'] += $scopeTotals['pairs_matched'];
            $totals['payout_usd'] = bcadd($totals['payout_usd'], $scopeTotals['payout_usd'], 2);
            $totals['scopes'][$scope] = $scopeTotals;
        }

        return $totals;
    }

    /**
     * Run the closing for a single user × scope and return the audit row (or null if nothing to do).
     */
    public function closeForUser(User $user, string $scope, ?CarbonInterface $closingDate = null): ?BinaryDailyClosing
    {
        $cfg = $this->scopeConfig($scope);
        if ($cfg === null) {
            return null;
        }

        $date = $this->resolveClosingDate($closingDate);

        return $this->processOne($user->id, $scope, $cfg, $date);
    }

    /**
     * Resolve / normalize the closing date into the configured timezone, at start-of-day.
     */
    private function resolveClosingDate(?CarbonInterface $closingDate): CarbonImmutable
    {
        $tz = $this->timezone();
        if ($closingDate === null) {
            return CarbonImmutable::now($tz)->subDay()->startOfDay();
        }

        return CarbonImmutable::instance($closingDate)->setTimezone($tz)->startOfDay();
    }

    /**
     * @return array{processed:int,paid_users:int,pairs_matched:int,payout_usd:string}
     */
    private function closeScope(string $scope, array $cfg, CarbonImmutable $date): array
    {
        $leftCol = $cfg['left_column'];
        $rightCol = $cfg['right_column'];

        $totals = [
            'processed' => 0,
            'paid_users' => 0,
            'pairs_matched' => 0,
            'payout_usd' => '0.00',
        ];

        User::query()
            ->where(function ($q) use ($leftCol, $rightCol) {
                $q->where($leftCol, '>', 0)->orWhere($rightCol, '>', 0);
            })
            ->orderBy('id')
            ->select(['id'])
            ->chunkById(500, function ($chunk) use (&$totals, $scope, $cfg, $date) {
                foreach ($chunk as $row) {
                    try {
                        $closing = $this->processOne((int) $row->id, $scope, $cfg, $date);
                    } catch (Throwable $e) {
                        Log::error('binary_closing.user_failed', [
                            'user_id' => (int) $row->id,
                            'scope' => $scope,
                            'closing_date' => $date->toDateString(),
                            'error' => $e->getMessage(),
                        ]);

                        continue;
                    }

                    if ($closing === null) {
                        continue;
                    }

                    $totals['processed']++;
                    $totals['pairs_matched'] += (int) $closing->pairs_matched;
                    $totals['payout_usd'] = bcadd($totals['payout_usd'], (string) $closing->payout_usd, 2);

                    if ((int) $closing->pairs_matched > 0) {
                        $totals['paid_users']++;
                    }
                }
            });

        return $totals;
    }

    /**
     * Atomically close one (user, scope, date). Idempotent — re-running with the same date is a no-op.
     */
    private function processOne(int $userId, string $scope, array $cfg, CarbonImmutable $date): ?BinaryDailyClosing
    {
        $leftCol = $cfg['left_column'];
        $rightCol = $cfg['right_column'];
        $perPair = $this->normalizeUsd((string) $cfg['pair_income_usd']);
        $maxPairs = max(0, (int) $cfg['max_pairs_per_day']);
        $txType = (string) $cfg['wallet_tx_type'];

        return DB::transaction(function () use ($userId, $scope, $leftCol, $rightCol, $perPair, $maxPairs, $txType, $date) {
            $existing = BinaryDailyClosing::query()
                ->where('user_id', $userId)
                ->where('scope', $scope)
                ->whereDate('closing_date', $date->toDateString())
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                return $existing;
            }

            /** @var User|null $user */
            $user = User::query()->whereKey($userId)->lockForUpdate()->first();
            if ($user === null) {
                return null;
            }

            $leftIn = (int) $user->{$leftCol};
            $rightIn = (int) $user->{$rightCol};

            if ($leftIn <= 0 && $rightIn <= 0) {
                return null;
            }

            $pairsAvailable = min($leftIn, $rightIn);
            $pairsMatched = min($pairsAvailable, $maxPairs);
            $capHit = $pairsAvailable > $maxPairs;

            $payout = bcmul((string) $pairsMatched, $perPair, 2);

            $leftAfterMatch = $leftIn - $pairsMatched;
            $rightAfterMatch = $rightIn - $pairsMatched;

            if ($leftAfterMatch >= $rightAfterMatch) {
                $leftOut = $leftAfterMatch;
                $rightOut = 0;
                $leftLapsed = 0;
                $rightLapsed = $rightAfterMatch;
            } else {
                $leftOut = 0;
                $rightOut = $rightAfterMatch;
                $leftLapsed = $leftAfterMatch;
                $rightLapsed = 0;
            }

            $walletTxId = null;
            $balanceAfter = (string) $user->wallet_balance;

            if (bccomp($payout, '0.00', 2) > 0) {
                $balanceAfter = bcadd($balanceAfter, $payout, 2);
                $user->wallet_balance = $balanceAfter;

                $tx = WalletTransaction::create([
                    'user_id' => $user->id,
                    'type' => $txType,
                    'amount' => $payout,
                    'balance_after' => $balanceAfter,
                    'meta' => [
                        'source' => 'binary_daily_closing',
                        'scope' => $scope,
                        'pairs' => $pairsMatched,
                        'per_pair_usd' => $perPair,
                        'closing_date' => $date->toDateString(),
                        'cap_hit' => $capHit,
                    ],
                ]);

                $walletTxId = $tx->id;
            }

            $user->{$leftCol} = $leftOut;
            $user->{$rightCol} = $rightOut;
            $user->save();

            return BinaryDailyClosing::create([
                'user_id' => $user->id,
                'closing_date' => $date->toDateString(),
                'scope' => $scope,
                'left_carry_in' => $leftIn,
                'right_carry_in' => $rightIn,
                'pairs_matched' => $pairsMatched,
                'cap_hit' => $capHit,
                'per_pair_usd' => $perPair,
                'payout_usd' => $payout,
                'balance_after_usd' => $balanceAfter,
                'left_carry_out' => $leftOut,
                'right_carry_out' => $rightOut,
                'left_lapsed' => $leftLapsed,
                'right_lapsed' => $rightLapsed,
                'wallet_transaction_id' => $walletTxId,
                'meta' => [
                    'pairs_available' => $pairsAvailable,
                    'max_pairs_per_day' => $maxPairs,
                    'timezone' => $this->timezone(),
                ],
            ]);
        });
    }

    /**
     * @return array<string, array{enabled:bool,left_column:string,right_column:string,wallet_tx_type:string,pair_income_usd:string,max_pairs_per_day:int}>
     */
    public function enabledScopes(): array
    {
        $out = [];
        foreach ((array) config('binary_closing.scopes', []) as $key => $cfg) {
            if (! is_array($cfg)) {
                continue;
            }
            if (! ($cfg['enabled'] ?? false)) {
                continue;
            }
            $out[(string) $key] = $cfg;
        }

        return $out;
    }

    public function scopeConfig(string $scope): ?array
    {
        $all = (array) config('binary_closing.scopes', []);

        return isset($all[$scope]) && is_array($all[$scope]) ? $all[$scope] : null;
    }

    public function timezone(): string
    {
        return (string) config('binary_closing.timezone', 'Asia/Kolkata');
    }

    /** "HH:MM" in the configured timezone. */
    public function closingTime(): string
    {
        return (string) config('binary_closing.closing_time', '00:00');
    }

    public function isEnabled(): bool
    {
        return (bool) config('binary_closing.enabled', true);
    }

    private function normalizeUsd(string $raw): string
    {
        $clean = preg_replace('/[^\d.\-]/', '', $raw) ?? '0';
        if ($clean === '' || $clean === '-' || $clean === '.') {
            $clean = '0';
        }

        return number_format((float) $clean, 2, '.', '');
    }
}

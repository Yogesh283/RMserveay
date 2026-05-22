<?php

namespace App\Services;

use App\Models\BinaryDailyClosing;
use App\Models\MatchingPayout;
use App\Models\User;
use App\Models\WalletTransaction;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Undo a binary daily closing for a calendar closing_date:
 * wallet debit, carry restore, delete closing audit + matching_payouts + wallet txs.
 */
class BinaryClosingReversalService
{
    public function __construct(
        protected BinaryDailyClosingService $closing,
    ) {}

    /**
     * @param  list<string>|null  $scopes  null = all scopes that have rows for this date
     * @return array{
     *     closing_date: string,
     *     users_affected: int,
     *     closings_deleted: int,
     *     payouts_deleted: int,
     *     wallet_tx_deleted: int,
     *     total_reversed_usd: string,
     *     dry_run: bool,
     * }
     */
    public function reverse(?CarbonInterface $closingDate = null, ?array $scopes = null, bool $dryRun = false): array
    {
        $date = $this->resolveClosingDate($closingDate);
        $closingDateStr = $date->toDateString();

        $scopeFilter = $scopes !== null && $scopes !== []
            ? array_flip(array_map('strval', $scopes))
            : null;

        $paidClosings = BinaryDailyClosing::query()
            ->whereDate('closing_date', $closingDateStr)
            ->where('payout_usd', '>', 0)
            ->when($scopeFilter !== null, fn ($q) => $q->whereIn('scope', array_keys($scopeFilter)))
            ->orderBy('id')
            ->get();

        if ($paidClosings->isEmpty()) {
            return $this->emptyResult($closingDateStr, $dryRun);
        }

        /** @var array<string, array{user_id:int, scope:string, payout_sum:string, left_in:int, right_in:int, closing_ids:list<int>, wallet_tx_ids:list<int>}> */
        $groups = [];

        foreach ($paidClosings as $row) {
            $key = $row->user_id.'|'.$row->scope;
            if (! isset($groups[$key])) {
                $groups[$key] = [
                    'user_id' => (int) $row->user_id,
                    'scope' => (string) $row->scope,
                    'payout_sum' => '0.00',
                    'left_in' => (int) $row->left_carry_in,
                    'right_in' => (int) $row->right_carry_in,
                    'closing_ids' => [],
                    'wallet_tx_ids' => [],
                ];
            }

            $groups[$key]['payout_sum'] = bcadd($groups[$key]['payout_sum'], (string) $row->payout_usd, 2);
            $groups[$key]['closing_ids'][] = (int) $row->id;

            if ($row->wallet_transaction_id !== null) {
                $groups[$key]['wallet_tx_ids'][(int) $row->wallet_transaction_id] = true;
            }
        }

        $walletTxIds = $this->collectWalletTransactionIds($groups, $closingDateStr);

        $totalReversed = '0.00';
        foreach ($groups as $g) {
            $totalReversed = bcadd($totalReversed, $g['payout_sum'], 2);
        }

        $closingsToDelete = BinaryDailyClosing::query()
            ->whereDate('closing_date', $closingDateStr)
            ->when($scopeFilter !== null, fn ($q) => $q->whereIn('scope', array_keys($scopeFilter)))
            ->count();

        $payoutsToDelete = MatchingPayout::query()
            ->whereDate('closing_date', $closingDateStr)
            ->when($scopeFilter !== null, fn ($q) => $q->whereIn('scope', array_keys($scopeFilter)))
            ->count();

        if ($dryRun) {
            return [
                'closing_date' => $closingDateStr,
                'users_affected' => count($groups),
                'closings_deleted' => $closingsToDelete,
                'payouts_deleted' => $payoutsToDelete,
                'wallet_tx_deleted' => count($walletTxIds),
                'total_reversed_usd' => $totalReversed,
                'dry_run' => true,
            ];
        }

        DB::transaction(function () use ($groups, $closingDateStr, $scopeFilter, $walletTxIds) {
            foreach ($groups as $g) {
                $this->reverseOneUserScope($g);
            }

            MatchingPayout::query()
                ->whereDate('closing_date', $closingDateStr)
                ->when($scopeFilter !== null, fn ($q) => $q->whereIn('scope', array_keys($scopeFilter)))
                ->delete();

            BinaryDailyClosing::query()
                ->whereDate('closing_date', $closingDateStr)
                ->when($scopeFilter !== null, fn ($q) => $q->whereIn('scope', array_keys($scopeFilter)))
                ->delete();

            if ($walletTxIds !== []) {
                WalletTransaction::query()->whereIn('id', $walletTxIds)->delete();
            }
        });

        return [
            'closing_date' => $closingDateStr,
            'users_affected' => count($groups),
            'closings_deleted' => $closingsToDelete,
            'payouts_deleted' => $payoutsToDelete,
            'wallet_tx_deleted' => count($walletTxIds),
            'total_reversed_usd' => $totalReversed,
            'dry_run' => false,
        ];
    }

    /**
     * @param  array<string, array{user_id:int, scope:string, payout_sum:string, left_in:int, right_in:int, closing_ids:list<int>, wallet_tx_ids:list<int|true>}>  $groups
     * @return list<int>
     */
    private function collectWalletTransactionIds(array $groups, string $closingDateStr): array
    {
        $ids = [];

        foreach ($groups as $g) {
            foreach (array_keys($g['wallet_tx_ids']) as $id) {
                $ids[$id] = true;
            }
        }

        $matchingTxIds = MatchingPayout::query()
            ->whereDate('closing_date', $closingDateStr)
            ->whereNotNull('wallet_transaction_id')
            ->pluck('wallet_transaction_id');

        foreach ($matchingTxIds as $id) {
            $ids[(int) $id] = true;
        }

        $types = [
            WalletTransaction::TYPE_ACTIVE_PANEL_MATCHING,
            WalletTransaction::TYPE_PANEL_MATCHING,
            WalletTransaction::TYPE_SUB_PANEL_MATCHING,
            WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING,
        ];

        foreach ($groups as $g) {
            $userId = $g['user_id'];
            $anchorIds = array_keys($g['wallet_tx_ids']);
            if ($anchorIds === []) {
                continue;
            }

            $anchor = BinaryDailyClosing::query()->whereIn('id', $g['closing_ids'])->orderBy('id')->first();
            if ($anchor === null) {
                continue;
            }

            $createdAt = $anchor->created_at;

            $related = WalletTransaction::query()
                ->where('user_id', $userId)
                ->whereIn('type', $types)
                ->where(function ($q) use ($closingDateStr, $createdAt) {
                    $q->where(function ($q2) use ($createdAt) {
                        $q2->where('created_at', '>=', $createdAt->copy()->subSeconds(15))
                            ->where('created_at', '<=', $createdAt->copy()->addSeconds(15));
                    })->orWhereRaw(
                        "JSON_UNQUOTE(JSON_EXTRACT(meta, '$.closing_date')) = ?",
                        [$closingDateStr],
                    );
                })
                ->pluck('id');

            foreach ($related as $id) {
                $ids[(int) $id] = true;
            }
        }

        return array_map('intval', array_keys($ids));
    }

    /**
     * @param  array{user_id:int, scope:string, payout_sum:string, left_in:int, right_in:int, closing_ids:list<int>, wallet_tx_ids:list<int|true>}  $g
     */
    private function reverseOneUserScope(array $g): void
    {
        $cfg = $this->closing->scopeConfig($g['scope']);
        if ($cfg === null) {
            return;
        }

        $leftCol = $cfg['left_column'];
        $rightCol = $cfg['right_column'];

        /** @var User|null $user */
        $user = User::query()->whereKey($g['user_id'])->lockForUpdate()->first();
        if ($user === null) {
            return;
        }

        $deduct = $g['payout_sum'];
        if (bccomp($deduct, '0.00', 2) > 0) {
            $user->wallet_balance = bcsub((string) $user->wallet_balance, $deduct, 2);
        }

        $storedLeft = (int) $user->{$leftCol};
        $storedRight = (int) $user->{$rightCol};
        $firstPaid = BinaryDailyClosing::query()
            ->whereIn('id', $g['closing_ids'])
            ->orderBy('id')
            ->first();

        $meta = is_array($firstPaid?->meta) ? $firstPaid->meta : [];
        $beforeL = $meta['stored_carry_left_before'] ?? null;
        $beforeR = $meta['stored_carry_right_before'] ?? null;

        if ($beforeL !== null && $beforeR !== null) {
            $user->{$leftCol} = (int) $beforeL;
            $user->{$rightCol} = (int) $beforeR;
        } elseif ($firstPaid !== null) {
            // Legacy closings: undo by adding matched pairs back to both carry_out legs.
            $pairs = (int) $firstPaid->pairs_matched;
            $user->{$leftCol} = (int) $firstPaid->left_carry_out + $pairs;
            $user->{$rightCol} = (int) $firstPaid->right_carry_out + $pairs;
        } else {
            $user->{$leftCol} = $g['left_in'];
            $user->{$rightCol} = $g['right_in'];
        }

        $user->save();

        DB::table('wallet')
            ->where('user_id', $user->id)
            ->update(['wallet_balance' => $user->wallet_balance]);
    }

    private function resolveClosingDate(?CarbonInterface $closingDate): CarbonImmutable
    {
        $tz = $this->closing->timezone();
        if ($closingDate === null) {
            return CarbonImmutable::now($tz)->subDay()->startOfDay();
        }

        return CarbonImmutable::instance($closingDate)->setTimezone($tz)->startOfDay();
    }

    /**
     * @return array{closing_date: string, users_affected: int, closings_deleted: int, payouts_deleted: int, wallet_tx_deleted: int, total_reversed_usd: string, dry_run: bool}
     */
    private function emptyResult(string $closingDateStr, bool $dryRun): array
    {
        return [
            'closing_date' => $closingDateStr,
            'users_affected' => 0,
            'closings_deleted' => 0,
            'payouts_deleted' => 0,
            'wallet_tx_deleted' => 0,
            'total_reversed_usd' => '0.00',
            'dry_run' => $dryRun,
        ];
    }
}

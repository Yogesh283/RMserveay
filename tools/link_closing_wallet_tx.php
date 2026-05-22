<?php

/**
 * Link orphan milestone wallet credits to binary_daily_closings + matching_payouts.
 * Usage: php tools/link_closing_wallet_tx.php [user_id] [closing_date] [scope]
 */

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$userId = (int) ($argv[1] ?? 0);
$date = $argv[2] ?? null;
$scope = $argv[3] ?? null;

$query = App\Models\BinaryDailyClosing::query()
    ->where('payout_usd', '>', 0)
    ->whereNull('wallet_transaction_id')
    ->orderByDesc('closing_date');

if ($userId > 0) {
    $query->where('user_id', $userId);
}
if ($date) {
    $query->whereDate('closing_date', $date);
}
if ($scope) {
    $query->where('scope', $scope);
}

$linked = 0;

foreach ($query->get() as $closing) {
    $types = match ($closing->scope) {
        App\Models\BinaryDailyClosing::SCOPE_PANEL => [App\Models\WalletTransaction::TYPE_SUB_PANEL_MATCHING],
        App\Models\BinaryDailyClosing::SCOPE_SUPER => [App\Models\WalletTransaction::TYPE_SUPER_SUB_PANEL_MATCHING],
        default => [(string) config('binary_closing.scopes.active_panel.wallet_tx_type', 'active_panel_matching')],
    };

    $dateStr = $closing->closing_date->toDateString();
    $tx = App\Models\WalletTransaction::query()
        ->where('user_id', $closing->user_id)
        ->whereIn('type', $types)
        ->where('amount', $closing->payout_usd)
        ->where(function ($q) use ($dateStr) {
            $q->where('meta->closing_date', $dateStr)
                ->orWhereDate('created_at', $dateStr);
        })
        ->orderByDesc('id')
        ->first();

    if ($tx === null) {
        continue;
    }

    $meta = is_array($tx->meta) ? $tx->meta : [];
    if (empty($meta['closing_date'])) {
        $tx->update([
            'meta' => array_merge($meta, [
                'source' => 'binary_daily_closing',
                'closing_date' => $dateStr,
                'scope' => $closing->scope,
            ]),
        ]);
    }

    $closing->update(['wallet_transaction_id' => $tx->id]);

    App\Models\MatchingPayout::query()
        ->where('user_id', $closing->user_id)
        ->where('scope', $closing->scope)
        ->whereDate('closing_date', $dateStr)
        ->update([
            'wallet_transaction_id' => $tx->id,
            'payout_usd' => $closing->payout_usd,
            'binary_daily_closing_id' => $closing->id,
        ]);

    $linked++;
    echo "Linked closing #{$closing->id} user={$closing->user_id} {$dateStr} {$closing->scope} → tx #{$tx->id}\n";
}

echo "Done. Linked {$linked} closing(s).\n";

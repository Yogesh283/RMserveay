<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\BinaryDailyClosing;
use App\Services\BinaryDailyClosingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MemberBinaryClosingController extends Controller
{
    public function __construct(private BinaryDailyClosingService $closing) {}

    /**
     * GET /api/member/programme/binary-closings
     *
     * Returns the authenticated user's most recent daily closings + the live config
     * (so the UI can show pair income, max pairs, next cut-off, etc.).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $perPage = (int) min(60, max(5, (int) $request->query('per_page', 30)));
        $scope = (string) $request->query('scope', '');

        $q = BinaryDailyClosing::query()
            ->where('user_id', $user->id)
            ->orderByDesc('closing_date')
            ->orderBy('scope');

        if ($scope !== '') {
            $q->where('scope', $scope);
        }

        $rows = $q->limit($perPage)->get();

        $totalsToday = BinaryDailyClosing::query()
            ->where('user_id', $user->id)
            ->whereDate('closing_date', now($this->closing->timezone())->subDay()->toDateString())
            ->get();

        return response()->json([
            'config' => [
                'enabled' => $this->closing->isEnabled(),
                'timezone' => $this->closing->timezone(),
                'closing_time' => $this->closing->closingTime(),
                'scopes' => collect($this->closing->enabledScopes())
                    ->map(fn ($cfg, $key) => [
                        'scope' => (string) $key,
                        'pair_income_usd' => (string) $cfg['pair_income_usd'],
                        'max_pairs_per_day' => (int) $cfg['max_pairs_per_day'],
                    ])
                    ->values(),
            ],
            'closings' => $rows->map(function (BinaryDailyClosing $r) {
                $meta = is_array($r->meta) ? $r->meta : [];

                return [
                    'id' => $r->id,
                    'closing_date' => $r->closing_date->toDateString(),
                    'scope' => $r->scope,
                    'left_carry_in' => (int) $r->left_carry_in,
                    'right_carry_in' => (int) $r->right_carry_in,
                    'pairs_matched' => (int) $r->pairs_matched,
                    'cap_hit' => (bool) $r->cap_hit,
                    'per_pair_usd' => (string) $r->per_pair_usd,
                    'payout_usd' => (string) $r->payout_usd,
                    'left_carry_out' => (int) $r->left_carry_out,
                    'right_carry_out' => (int) $r->right_carry_out,
                    'left_lapsed' => (int) $r->left_lapsed,
                    'right_lapsed' => (int) $r->right_lapsed,
                    'income_eligible' => (bool) ($meta['income_eligible'] ?? true),
                    'income_paid' => (bool) ($meta['income_eligible'] ?? true) && bccomp((string) $r->payout_usd, '0.00', 2) > 0,
                    'income_blocked_reason' => $meta['income_blocked_reason'] ?? null,
                    'milestone_paid_usd' => (string) ($meta['milestone_paid_usd'] ?? '0.00'),
                    'per_pair_paid_usd' => (string) ($meta['per_pair_paid_usd'] ?? '0.00'),
                    'wallet_transaction_id' => $r->wallet_transaction_id,
                    'created_at' => $r->created_at?->toIso8601String(),
                ];
            })->values(),
            'last_closing' => [
                'date' => $totalsToday->first()?->closing_date?->toDateString(),
                'pairs_matched_total' => (int) $totalsToday->sum('pairs_matched'),
                'payout_usd_total' => number_format((float) $totalsToday->sum('payout_usd'), 2, '.', ''),
            ],
        ]);
    }
}

<?php

namespace Tests\Feature;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\BinaryDailyClosingService;
use App\Services\PanelMatchingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class BinaryDailyClosingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'binary_closing.enabled' => true,
            'binary_closing.use_daily_carry_ledger' => false,
            'binary_closing.timezone' => 'Asia/Kolkata',
            'binary_closing.closing_time' => '00:00',
            'binary_closing.scopes.panel.enabled' => true,
            'binary_closing.scopes.panel.left_column' => 'panel_match_carry_left',
            'binary_closing.scopes.panel.right_column' => 'panel_match_carry_right',
            'binary_closing.scopes.panel.wallet_tx_type' => WalletTransaction::TYPE_PANEL_MATCHING,
            'binary_closing.scopes.panel.pair_income_usd' => '1.00',
            'binary_closing.scopes.panel.max_pairs_per_day' => 20,
            'binary_closing.scopes.super.enabled' => false,
        ]);
    }

    private function makeUser(int $left, int $right, string $balance = '0.00'): User
    {
        return User::factory()->create([
            'panel_match_carry_left' => $left,
            'panel_match_carry_right' => $right,
            'wallet_balance' => $balance,
            'activation_fee_paid_at' => now(),
            'minimum_panel_fee_paid_at' => now(),
            'sub_panel_count' => (int) config('self_survey.max_sub_panels', 9),
        ]);
    }

    public function test_one_left_plus_one_right_equals_one_pair_and_credits_wallet(): void
    {
        $user = $this->makeUser(1, 1);

        $closing = app(BinaryDailyClosingService::class)
            ->closeForUser($user, BinaryDailyClosing::SCOPE_PANEL, Carbon::parse('2026-05-08', 'Asia/Kolkata'));

        $this->assertNotNull($closing);
        $this->assertSame(1, (int) $closing->pairs_matched);
        $this->assertSame('1.00', (string) $closing->payout_usd);

        $user->refresh();
        $this->assertSame('1.00', (string) $user->wallet_balance);
        $this->assertSame(0, (int) $user->panel_match_carry_left);
        $this->assertSame(0, (int) $user->panel_match_carry_right);

        $this->assertDatabaseHas('wallet_transactions', [
            'user_id' => $user->id,
            'type' => WalletTransaction::TYPE_PANEL_MATCHING,
            'amount' => '1.00',
        ]);
    }

    public function test_higher_side_carries_forward_and_lower_side_lapses_to_zero(): void
    {
        $user = $this->makeUser(left: 5, right: 3);

        $closing = app(BinaryDailyClosingService::class)
            ->closeForUser($user, BinaryDailyClosing::SCOPE_PANEL);

        $this->assertNotNull($closing);
        $this->assertSame(3, (int) $closing->pairs_matched);

        $user->refresh();
        $this->assertSame(2, (int) $user->panel_match_carry_left, 'Higher leg keeps the leftover (5-3=2)');
        $this->assertSame(0, (int) $user->panel_match_carry_right, 'Lower leg fully consumed');
        $this->assertSame(0, (int) $closing->left_lapsed);
        $this->assertSame(0, (int) $closing->right_lapsed);
        $this->assertSame('3.00', (string) $user->wallet_balance);
    }

    public function test_pair_cap_clamps_at_20_and_lapses_lower_remainder(): void
    {
        $user = $this->makeUser(left: 25, right: 22);

        $closing = app(BinaryDailyClosingService::class)
            ->closeForUser($user, BinaryDailyClosing::SCOPE_PANEL);

        $this->assertNotNull($closing);
        $this->assertSame(20, (int) $closing->pairs_matched, 'Capped at 20 pairs/day');
        $this->assertTrue((bool) $closing->cap_hit);
        $this->assertSame('20.00', (string) $closing->payout_usd);

        $user->refresh();
        $this->assertSame(3, (int) $user->panel_match_carry_left, 'Strong leg keeps diff only (25-22=3)');
        $this->assertSame(0, (int) $user->panel_match_carry_right, 'Weak leg fully consumed');
        $this->assertSame(2, (int) $closing->right_lapsed);
        $this->assertSame(2, (int) $closing->left_lapsed);
    }

    public function test_no_pair_when_one_leg_is_zero(): void
    {
        $user = $this->makeUser(left: 7, right: 0);

        $closing = app(BinaryDailyClosingService::class)
            ->closeForUser($user, BinaryDailyClosing::SCOPE_PANEL);

        $this->assertNotNull($closing);
        $this->assertSame(0, (int) $closing->pairs_matched);
        $this->assertSame('0.00', (string) $closing->payout_usd);

        $user->refresh();
        $this->assertSame(7, (int) $user->panel_match_carry_left, 'Higher leg keeps everything');
        $this->assertSame(0, (int) $user->panel_match_carry_right);
        $this->assertSame('0.00', (string) $user->wallet_balance, 'No wallet credit when no pair forms');
    }

    public function test_running_closing_twice_for_same_date_skips_when_carry_exhausted(): void
    {
        $user = $this->makeUser(2, 2);
        $date = Carbon::parse('2026-05-08', 'Asia/Kolkata');

        $first = app(BinaryDailyClosingService::class)->closeForUser($user, BinaryDailyClosing::SCOPE_PANEL, $date);
        $this->assertNotNull($first);

        $second = app(BinaryDailyClosingService::class)->closeForUser($user, BinaryDailyClosing::SCOPE_PANEL, $date);
        $this->assertNull($second, 'No carry left — nothing to close again');

        $this->assertSame(1, BinaryDailyClosing::query()->where('user_id', $user->id)->count());
        $this->assertSame(1, WalletTransaction::query()
            ->where('user_id', $user->id)
            ->where('type', WalletTransaction::TYPE_PANEL_MATCHING)
            ->count());
    }

    public function test_close_all_processes_every_user_with_carry_and_writes_audit_rows(): void
    {
        $alice = $this->makeUser(4, 4);
        $bob = $this->makeUser(50, 1);
        $carol = $this->makeUser(0, 0);

        $totals = app(BinaryDailyClosingService::class)->closeAll(Carbon::parse('2026-05-08', 'Asia/Kolkata'));

        $this->assertSame(2, $totals['processed'], 'Alice + Bob processed; Carol skipped (no carry)');
        $this->assertSame(2, $totals['paid_users']);
        $this->assertSame(5, $totals['pairs_matched'], '4 (alice) + 1 (bob) = 5');
        $this->assertSame('5.00', $totals['payout_usd']);

        $this->assertDatabaseHas('binary_daily_closings', ['user_id' => $alice->id, 'pairs_matched' => 4]);
        $this->assertDatabaseHas('binary_daily_closings', ['user_id' => $bob->id, 'pairs_matched' => 1]);
        $this->assertDatabaseMissing('binary_daily_closings', ['user_id' => $carol->id]);

        $alice->refresh();
        $bob->refresh();
        $this->assertSame('4.00', (string) $alice->wallet_balance);
        $this->assertSame('1.00', (string) $bob->wallet_balance);
        $this->assertSame(49, (int) $bob->panel_match_carry_left, 'Bob carries 49 left, 0 right (lapsed nothing)');
        $this->assertSame(0, (int) $bob->panel_match_carry_right);
    }

    public function test_admin_configurable_pair_income_is_respected(): void
    {
        config(['binary_closing.scopes.panel.pair_income_usd' => '2.50']);

        $user = $this->makeUser(3, 3);

        $closing = app(BinaryDailyClosingService::class)
            ->closeForUser($user, BinaryDailyClosing::SCOPE_PANEL);

        $this->assertNotNull($closing);
        $this->assertSame('2.50', (string) $closing->per_pair_usd);
        $this->assertSame('7.50', (string) $closing->payout_usd, '3 pairs × $2.50 = $7.50');

        $user->refresh();
        $this->assertSame('7.50', (string) $user->wallet_balance);
    }

    public function test_admin_configurable_pair_cap_is_respected(): void
    {
        config(['binary_closing.scopes.panel.max_pairs_per_day' => 5]);

        $user = $this->makeUser(10, 10);

        $closing = app(BinaryDailyClosingService::class)
            ->closeForUser($user, BinaryDailyClosing::SCOPE_PANEL);

        $this->assertNotNull($closing);
        $this->assertSame(5, (int) $closing->pairs_matched);
        $this->assertTrue((bool) $closing->cap_hit);

        $user->refresh();
        $this->assertSame(0, (int) $user->panel_match_carry_left, 'Equal legs → weak/strong diff is 0 after match');
        $this->assertSame(0, (int) $user->panel_match_carry_right);
    }

    public function test_artisan_command_runs_closing_and_returns_success(): void
    {
        $user = $this->makeUser(2, 1);

        $this->artisan('binary:daily-closing', ['--date' => '2026-05-08'])
            ->assertExitCode(0);

        $row = BinaryDailyClosing::query()->where('user_id', $user->id)->firstOrFail();
        $this->assertSame('2026-05-08', $row->closing_date->toDateString());
        $this->assertSame(1, (int) $row->pairs_matched);

        $user->refresh();
        $this->assertSame('1.00', (string) $user->wallet_balance);
    }

    public function test_realtime_panel_matching_is_bypassed_when_daily_closing_owns_the_scope(): void
    {
        // Eligible upline (9/9 sub panels + active panelist) — would normally pay in real-time.
        $earner = User::factory()->create([
            'user_type' => 'normal',
            'activation_fee_paid_at' => now(),
            'minimum_panel_fee_paid_at' => now(),
            'sub_panel_count' => 9,
            'panel_match_carry_left' => 0,
            'panel_match_carry_right' => 5,
            'wallet_balance' => '0.00',
        ]);

        $buyer = User::factory()->create([
            'user_type' => 'normal',
            'binary_parent_id' => $earner->id,
            'binary_side' => 'left',
        ]);

        app(PanelMatchingService::class)->processSubPanelPurchase($buyer);

        $earner->refresh();
        $this->assertSame(1, (int) $earner->panel_match_carry_left, 'Carry incremented');
        $this->assertSame(5, (int) $earner->panel_match_carry_right, 'Right untouched');
        $this->assertSame('0.00', (string) $earner->wallet_balance, 'No real-time payout — closing owns it');

        $this->assertDatabaseMissing('wallet_transactions', [
            'user_id' => $earner->id,
            'type' => WalletTransaction::TYPE_PANEL_MATCHING,
        ]);

        // Now run the daily closing — the carry must be matched and credited here.
        app(BinaryDailyClosingService::class)
            ->closeForUser($earner, BinaryDailyClosing::SCOPE_PANEL, Carbon::parse('2026-05-08', 'Asia/Kolkata'));

        $earner->refresh();
        // 1 pair × $1 per-pair (milestone tier 2 needs 2+ pairs in one closing day).
        $this->assertSame('1.00', (string) $earner->wallet_balance);
        $this->assertSame(0, (int) $earner->panel_match_carry_left);
        $this->assertSame(4, (int) $earner->panel_match_carry_right, '5-1 carries forward');

        $this->assertDatabaseHas('wallet_transactions', [
            'user_id' => $earner->id,
            'type' => WalletTransaction::TYPE_PANEL_MATCHING,
            'amount' => '1.00',
        ]);
    }

    public function test_closing_also_fires_sub_panel_milestone_income_per_matched_pair(): void
    {
        $leftLeg = User::factory()->create(['sub_panel_count' => 2]);
        $rightLeg = User::factory()->create(['sub_panel_count' => 2]);
        $earner = User::factory()->create([
            'user_type' => 'normal',
            'activation_fee_paid_at' => now(),
            'minimum_panel_fee_paid_at' => now(),
            'sub_panel_count' => 9,
            'left_child_id' => $leftLeg->id,
            'right_child_id' => $rightLeg->id,
            'panel_match_carry_left' => 1,
            'panel_match_carry_right' => 1,
            'wallet_balance' => '0.00',
        ]);

        // 1 pair → per-pair $1 only (milestone tier 2 needs 2+ pairs today).
        app(BinaryDailyClosingService::class)
            ->closeForUser($earner, BinaryDailyClosing::SCOPE_PANEL, Carbon::parse('2026-05-08', 'Asia/Kolkata'));

        $earner->refresh();
        $this->assertSame('1.00', (string) $earner->wallet_balance);

        $this->assertDatabaseHas('wallet_transactions', [
            'user_id' => $earner->id,
            'type' => WalletTransaction::TYPE_PANEL_MATCHING,
            'amount' => '1.00',
        ]);
    }

    public function test_daily_ledger_skips_when_no_purchases_on_closing_date(): void
    {
        config(['binary_closing.use_daily_carry_ledger' => true]);

        $user = $this->makeUser(2, 3);

        $closing = app(BinaryDailyClosingService::class)
            ->closeForUser($user, BinaryDailyClosing::SCOPE_PANEL, Carbon::parse('2026-05-21', 'Asia/Kolkata'));

        $this->assertNull($closing);
    }

    public function test_daily_ledger_skips_one_sided_daily_or_stored_only(): void
    {
        config(['binary_closing.use_daily_carry_ledger' => true]);

        $user = $this->makeUser(0, 88);

        $closing = app(BinaryDailyClosingService::class)
            ->closeForUser($user, BinaryDailyClosing::SCOPE_PANEL, Carbon::parse('2026-05-21', 'Asia/Kolkata'));

        $this->assertNull($closing);
    }
}

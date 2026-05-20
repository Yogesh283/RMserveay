<?php

namespace Tests\Feature;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Services\AdminMemberAccountService;
use App\Services\BinaryDailyClosingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AdminActivePanelMatchingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'binary_closing.enabled' => true,
            'binary_closing.timezone' => 'Asia/Kolkata',
            'binary_closing.scopes.active_panel.enabled' => true,
            'binary_closing.scopes.active_panel.pair_income_usd' => '1.00',
            'binary_closing.scopes.active_panel.max_pairs_per_day' => 20,
            'binary_closing.scopes.panel.enabled' => false,
            'binary_closing.scopes.super.enabled' => false,
        ]);
    }

    public function test_admin_mark_active_panel_paid_increments_upline_carry_for_daily_closing(): void
    {
        $earner = User::factory()->create([
            'activation_fee_paid_at' => now(),
            'minimum_panel_fee_paid_at' => now(),
            'active_panel_match_carry_left' => 0,
            'active_panel_match_carry_right' => 0,
        ]);

        $leftBuyer = User::factory()->create([
            'activation_fee_paid_at' => now(),
            'binary_parent_id' => $earner->id,
            'binary_side' => 'left',
        ]);

        $rightBuyer = User::factory()->create([
            'activation_fee_paid_at' => now(),
            'binary_parent_id' => $earner->id,
            'binary_side' => 'right',
        ]);

        app(AdminMemberAccountService::class)->activateMinimumPanel($leftBuyer);
        app(AdminMemberAccountService::class)->activateMinimumPanel($rightBuyer);

        $earner->refresh();
        $this->assertSame(1, (int) $earner->active_panel_match_carry_left);
        $this->assertSame(1, (int) $earner->active_panel_match_carry_right);

        $closing = app(BinaryDailyClosingService::class)
            ->closeForUser($earner, BinaryDailyClosing::SCOPE_ACTIVE_PANEL, Carbon::parse('2026-05-08', 'Asia/Kolkata'));

        $this->assertNotNull($closing);
        $this->assertSame(1, (int) $closing->pairs_matched);
        $this->assertSame('1.00', (string) $closing->payout_usd);

        $earner->refresh();
        $this->assertSame('1.00', (string) $earner->wallet_balance);
    }

    public function test_inactive_earner_keeps_carry_and_gets_no_active_panel_closing_payout(): void
    {
        $inactiveEarner = User::factory()->create([
            'activation_fee_paid_at' => null,
            'minimum_panel_fee_paid_at' => null,
            'active_panel_match_carry_left' => 5,
            'active_panel_match_carry_right' => 3,
            'wallet_balance' => '0.00',
        ]);

        $closing = app(BinaryDailyClosingService::class)
            ->closeForUser($inactiveEarner, BinaryDailyClosing::SCOPE_ACTIVE_PANEL, Carbon::parse('2026-05-08', 'Asia/Kolkata'));

        $this->assertNull($closing);

        $inactiveEarner->refresh();
        $this->assertSame(5, (int) $inactiveEarner->active_panel_match_carry_left);
        $this->assertSame(3, (int) $inactiveEarner->active_panel_match_carry_right);
        $this->assertSame('0.00', (string) $inactiveEarner->wallet_balance);
    }

    public function test_admin_activate_without_binary_parent_skips_carry_but_does_not_error(): void
    {
        $orphan = User::factory()->create([
            'activation_fee_paid_at' => now(),
            'binary_parent_id' => null,
        ]);

        app(AdminMemberAccountService::class)->activateMinimumPanel($orphan);

        $orphan->refresh();
        $this->assertNotNull($orphan->minimum_panel_fee_paid_at);
        $this->assertSame(0, (int) $orphan->active_panel_match_carry_left);
    }
}

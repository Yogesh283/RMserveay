<?php

namespace Tests\Unit;

use App\Models\BinaryDailyClosing;
use App\Models\User;
use App\Support\BinaryClosingCalendar;
use App\Support\BinaryClosingDisplay;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class BinaryClosingDisplayTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_income_lock_uses_first_paid_closing_not_latest_re_run(): void
    {
        config([
            'binary_closing.timezone' => 'Asia/Kolkata',
            'binary_closing.closing_time' => '10:00',
        ]);

        Carbon::setTestNow(Carbon::parse('2026-05-20 11:00:00', 'Asia/Kolkata'));

        $user = User::factory()->create();

        BinaryDailyClosing::create([
            'user_id' => $user->id,
            'closing_date' => '2026-05-19',
            'scope' => BinaryDailyClosing::SCOPE_PANEL,
            'left_carry_in' => 20,
            'right_carry_in' => 18,
            'pairs_matched' => 18,
            'cap_hit' => false,
            'per_pair_usd' => '0.00',
            'payout_usd' => '128.00',
            'balance_after_usd' => '128.00',
            'left_carry_out' => 2,
            'right_carry_out' => 0,
            'left_lapsed' => 0,
            'right_lapsed' => 0,
            'meta' => ['milestone' => 128, 'milestone_paid_usd' => '128.00'],
            'created_at' => Carbon::parse('2026-05-20 10:05:00', 'Asia/Kolkata'),
        ]);

        BinaryDailyClosing::create([
            'user_id' => $user->id,
            'closing_date' => '2026-05-19',
            'scope' => BinaryDailyClosing::SCOPE_PANEL,
            'left_carry_in' => 2,
            'right_carry_in' => 0,
            'pairs_matched' => 0,
            'cap_hit' => false,
            'per_pair_usd' => '0.00',
            'payout_usd' => '256.00',
            'balance_after_usd' => '384.00',
            'left_carry_out' => 2,
            'right_carry_out' => 0,
            'left_lapsed' => 0,
            'right_lapsed' => 0,
            'meta' => ['milestone' => 256, 'milestone_paid_usd' => '256.00'],
            'created_at' => Carbon::parse('2026-05-20 12:00:00', 'Asia/Kolkata'),
        ]);

        $first = BinaryClosingDisplay::firstPaidInCurrentCycle($user->id, BinaryDailyClosing::SCOPE_PANEL);
        $this->assertNotNull($first);
        $this->assertSame('128.00', BinaryClosingDisplay::lockedPayoutUsd($first));

        $latest = BinaryDailyClosing::latestForDisplay($user->id, BinaryDailyClosing::SCOPE_PANEL);
        $this->assertNotNull($latest);
        $this->assertSame(0, (int) $latest->pairs_matched);
        $this->assertSame(2, (int) $latest->left_carry_out);

        $this->assertTrue(BinaryClosingDisplay::incomeLockedInCurrentCycle($user->id, BinaryDailyClosing::SCOPE_PANEL));
    }
}

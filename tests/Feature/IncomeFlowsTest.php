<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\PanelMatchingService;
use App\Services\SelfSurveyIncomeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IncomeFlowsTest extends TestCase
{
    use RefreshDatabase;

    public function test_direct_income_is_credited_to_eligible_sponsor_from_survey_credit(): void
    {
        $sponsor = User::factory()->create([
            'user_type' => 'normal',
            'activation_fee_paid_at' => now(),
            'minimum_panel_fee_paid_at' => now(),
            'sub_panel_count' => 1,
            'wallet_balance' => '0.00',
        ]);

        $downline = User::factory()->create([
            'user_type' => 'normal',
            'sponsor_id' => $sponsor->id,
            'activation_fee_paid_at' => now(),
            'minimum_panel_fee_paid_at' => now(),
            'sub_panel_count' => 1,
            'wallet_balance' => '0.00',
        ]);

        app(SelfSurveyIncomeService::class)->creditSurvey($downline, 'income-test-ref-1');

        $directTx = WalletTransaction::query()
            ->where('user_id', $sponsor->id)
            ->where('type', WalletTransaction::TYPE_DIRECT_COMMISSION)
            ->first();

        $this->assertNotNull($directTx, 'Direct commission transaction should be created for eligible sponsor.');
        $this->assertSame('0.20', number_format((float) $directTx->amount, 2, '.', ''));
    }

    public function test_level_income_is_distributed_per_level_only_to_active_panelists(): void
    {
        $level3 = User::factory()->create([
            'user_type' => 'normal',
            'wallet_balance' => '0.00',
        ]);

        $level2 = User::factory()->create([
            'user_type' => 'normal',
            'sponsor_id' => $level3->id,
            'activation_fee_paid_at' => now(),
            'minimum_panel_fee_paid_at' => now(),
            'wallet_balance' => '0.00',
        ]);

        $level1 = User::factory()->create([
            'user_type' => 'normal',
            'sponsor_id' => $level2->id,
            'activation_fee_paid_at' => now(),
            'minimum_panel_fee_paid_at' => now(),
            'wallet_balance' => '0.00',
        ]);

        $earner = User::factory()->create([
            'user_type' => 'normal',
            'sponsor_id' => $level1->id,
            'activation_fee_paid_at' => now(),
            'minimum_panel_fee_paid_at' => now(),
            'sub_panel_count' => 1,
            'wallet_balance' => '0.00',
        ]);

        app(SelfSurveyIncomeService::class)->creditSurvey($earner, 'income-test-ref-2');

        $level1Tx = WalletTransaction::query()
            ->where('user_id', $level1->id)
            ->where('type', WalletTransaction::TYPE_SURVEY_LEVEL_INCOME)
            ->where('meta->level', 1)
            ->first();
        $level2Tx = WalletTransaction::query()
            ->where('user_id', $level2->id)
            ->where('type', WalletTransaction::TYPE_SURVEY_LEVEL_INCOME)
            ->where('meta->level', 2)
            ->first();
        $level3Tx = WalletTransaction::query()
            ->where('user_id', $level3->id)
            ->where('type', WalletTransaction::TYPE_SURVEY_LEVEL_INCOME)
            ->where('meta->level', 3)
            ->first();

        $this->assertNotNull($level1Tx, 'Level 1 active panelist should receive level income.');
        $this->assertNotNull($level2Tx, 'Level 2 active panelist should receive level income.');
        $this->assertNull($level3Tx, 'Inactive level should not receive level income.');
    }

    public function test_panel_matching_income_requires_full_sub_panel_completion_nine_of_nine(): void
    {
        $earner = User::factory()->create([
            'user_type' => 'normal',
            'sub_panel_count' => 8,
            'panel_match_carry_left' => 0,
            'panel_match_carry_right' => 1,
            'wallet_balance' => '0.00',
        ]);

        $buyer = User::factory()->create([
            'user_type' => 'normal',
            'binary_parent_id' => $earner->id,
            'binary_side' => 'left',
        ]);

        app(PanelMatchingService::class)->processSubPanelPurchase($buyer);

        $beforeEligibleTx = WalletTransaction::query()
            ->where('user_id', $earner->id)
            ->where('type', WalletTransaction::TYPE_PANEL_MATCHING)
            ->first();

        $this->assertNull($beforeEligibleTx, 'Panel matching should not pay before 9/9 sub panels.');

        $earner->sub_panel_count = 9;
        $earner->save();

        app(PanelMatchingService::class)->processSubPanelPurchase($buyer);

        $afterEligibleTx = WalletTransaction::query()
            ->where('user_id', $earner->id)
            ->where('type', WalletTransaction::TYPE_PANEL_MATCHING)
            ->first();

        $this->assertNotNull($afterEligibleTx, 'Panel matching should pay after 9/9 sub panels.');
    }
}


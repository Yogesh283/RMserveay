<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\PanelMatchingService;
use App\Services\SelfSurveyIncomeService;
use App\Services\SuperSubPanelMatchingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IncomeFlowsTest extends TestCase
{
    use RefreshDatabase;

    public function test_direct_income_flows_when_referral_buys_any_panel_even_if_sponsor_has_no_panel_slot(): void
    {
        $sponsor = User::factory()->create([
            'user_type' => 'normal',
            'activation_fee_paid_at' => now(),
            'minimum_panel_fee_paid_at' => now(),
            'sub_panel_count' => 0,
            'super_sub_panel_count' => 0,
            'wallet_balance' => '0.00',
        ]);

        $downline = User::factory()->create([
            'user_type' => 'normal',
            'sponsor_id' => $sponsor->id,
            'activation_fee_paid_at' => now(),
            'minimum_panel_fee_paid_at' => now(),
            'wallet_balance' => '50.00',
        ]);

        app(SelfSurveyIncomeService::class)->debitFee(
            $downline,
            (string) config('self_survey.sub_panel_entry_fee'),
            WalletTransaction::TYPE_SUB_PANEL_FEE,
        );

        $directTx = WalletTransaction::query()
            ->where('user_id', $sponsor->id)
            ->where('type', WalletTransaction::TYPE_DIRECT_COMMISSION)
            ->first();

        $this->assertNotNull(
            $directTx,
            'Sponsor should receive direct income on referral panel buy without owning a panel slot themselves.'
        );
        $expected = bcmul((string) config('self_survey.sub_panel_entry_fee'), (string) config('direct_income.rate'), 2);
        $this->assertSame($expected, (string) $directTx->amount);
    }

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

        $downline->refresh();
        $this->assertSame('0.00', number_format((float) $downline->wallet_balance, 2, '.', ''));
        $this->assertGreaterThan(0, (float) $downline->survey_wallet_balance);

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
        // This test exercises the legacy real-time matching path; the daily-closing
        // takeover is verified separately in BinaryDailyClosingTest.
        config(['binary_closing.scopes.panel.enabled' => false]);

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

    public function test_matching_table_status_counts_full_left_and_right_team_legs(): void
    {
        $earner = User::factory()->create(['user_type' => 'normal']);

        $left = User::factory()->create([
            'user_type' => 'normal',
            'binary_parent_id' => $earner->id,
            'binary_side' => 'left',
            'sub_panel_count' => 1,
            'super_sub_panel_count' => 2,
        ]);
        $leftDeep = User::factory()->create([
            'user_type' => 'normal',
            'binary_parent_id' => $left->id,
            'binary_side' => 'left',
            'sub_panel_count' => 2,
            'super_sub_panel_count' => 3,
        ]);
        $right = User::factory()->create([
            'user_type' => 'normal',
            'binary_parent_id' => $earner->id,
            'binary_side' => 'right',
            'sub_panel_count' => 4,
            'super_sub_panel_count' => 5,
        ]);

        $earner->left_child_id = $left->id;
        $earner->right_child_id = $right->id;
        $earner->save();

        $left->left_child_id = $leftDeep->id;
        $left->save();

        $panelStatus = app(PanelMatchingService::class)->status($earner->fresh());
        $superStatus = app(SuperSubPanelMatchingService::class)->status($earner->fresh());

        $this->assertSame(3, $panelStatus['total_left_subs']);
        $this->assertSame(4, $panelStatus['total_right_subs']);
        $this->assertSame(5, $superStatus['total_left_supers']);
        $this->assertSame(5, $superStatus['total_right_supers']);
    }

    public function test_survey_credit_skipped_when_admin_disables_wallet_credit_for_user(): void
    {
        $earner = User::factory()->create([
            'user_type' => 'normal',
            'activation_fee_paid_at' => now(),
            'minimum_panel_fee_paid_at' => now(),
            'sub_panel_count' => 1,
            'survey_wallet_balance' => '0.00',
            'survey_income_wallet_credit_enabled' => false,
        ]);

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);

        try {
            app(SelfSurveyIncomeService::class)->creditSurvey($earner, 'disabled-wallet-ref');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $this->assertSame(422, $e->getStatusCode());
            throw $e;
        }
    }
}


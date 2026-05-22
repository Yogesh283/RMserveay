<?php

namespace Tests\Unit;

use App\Support\MatchingMilestoneTable;
use Tests\TestCase;

class MatchingMilestoneTableTest extends TestCase
{
    public function test_nearest_lower_tier_for_fifty_pairs(): void
    {
        $this->assertSame(32, MatchingMilestoneTable::nearestTierAtOrBelow(50, 'sub_panel_matching.milestones'));
        $this->assertSame('32.00', MatchingMilestoneTable::payoutUsdForTier(32, 'panel'));
    }

    public function test_forty_tier_example_when_configured(): void
    {
        config(['sub_panel_matching.milestones' => [2, 4, 8, 16, 32, 40, 64, 128, 256]]);

        $this->assertSame(40, MatchingMilestoneTable::nearestTierAtOrBelow(50, 'sub_panel_matching.milestones'));
        $this->assertSame(32, MatchingMilestoneTable::nearestTierAtOrBelow(39, 'sub_panel_matching.milestones'));
    }
}

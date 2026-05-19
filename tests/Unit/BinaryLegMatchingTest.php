<?php

namespace Tests\Unit;

use App\Support\BinaryLegMatching;
use PHPUnit\Framework\TestCase;

class BinaryLegMatchingTest extends TestCase
{
    public function test_team_volume_225_vs_216_yields_nine_left_carry(): void
    {
        $leg = BinaryLegMatching::fromLegVolumes(225, 216);

        $this->assertSame(216, $leg['pairs_1_1']);
        $this->assertSame(9, $leg['carry_left']);
        $this->assertSame(0, $leg['carry_right']);
    }

    public function test_milestone_on_216_pairs_pays_128_and_lapses_88(): void
    {
        $split = BinaryLegMatching::milestoneSplit(216, [2, 4, 8, 16, 32, 64, 128, 256]);

        $this->assertSame(128, $split['milestone']);
        $this->assertSame('128', $split['payout_usd']);
        $this->assertSame(88, $split['lapsed_pairs']);
    }
}

<?php

namespace Tests\Unit;

use App\Support\BinaryClosingCalendar;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class BinaryClosingCalendarTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_cycle_start_before_closing_time_uses_previous_boundary(): void
    {
        config([
            'binary_closing.timezone' => 'Asia/Kolkata',
            'binary_closing.closing_time' => '10:00',
        ]);

        Carbon::setTestNow(Carbon::parse('2026-05-20 09:30:00', 'Asia/Kolkata'));

        $start = BinaryClosingCalendar::currentCycleStart();

        $this->assertSame('2026-05-19 10:00:00', $start->format('Y-m-d H:i:s'));
        $this->assertSame('2026-05-19', BinaryClosingCalendar::pendingClosingDateForCurrentCycle());
    }

    public function test_cycle_start_after_closing_time_uses_today_boundary(): void
    {
        config([
            'binary_closing.timezone' => 'Asia/Kolkata',
            'binary_closing.closing_time' => '10:00',
        ]);

        Carbon::setTestNow(Carbon::parse('2026-05-20 11:00:00', 'Asia/Kolkata'));

        $start = BinaryClosingCalendar::currentCycleStart();

        $this->assertSame('2026-05-20 10:00:00', $start->format('Y-m-d H:i:s'));
        $this->assertSame('2026-05-20', BinaryClosingCalendar::pendingClosingDateForCurrentCycle());
    }

    public function test_midnight_closing_aligns_with_calendar_day_start(): void
    {
        config([
            'binary_closing.timezone' => 'Asia/Kolkata',
            'binary_closing.closing_time' => '00:00',
        ]);

        Carbon::setTestNow(Carbon::parse('2026-05-20 08:00:00', 'Asia/Kolkata'));

        $start = BinaryClosingCalendar::currentCycleStart();

        $this->assertSame('2026-05-20 00:00:00', $start->format('Y-m-d H:i:s'));
    }
}

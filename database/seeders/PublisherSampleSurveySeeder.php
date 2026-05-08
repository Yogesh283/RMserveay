<?php

namespace Database\Seeders;

use App\Models\Survey;
use App\Models\SurveyQuestion;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Inserts one active sample survey for publisher dashboard testing.
 *
 * Usage: php artisan db:seed --class=PublisherSampleSurveySeeder
 */
class PublisherSampleSurveySeeder extends Seeder
{
    private const TITLE = 'RM Survey — Brand Pulse (Sample)';

    public function run(): void
    {
        $publisher = User::query()->where('user_type', 'publisher')->orderBy('id')->first();

        if ($publisher === null) {
            $publisher = User::factory()->create([
                'name' => 'Demo Publisher',
                'email' => 'publisher-demo-' . Str::lower(Str::random(6)) . '@rmsurvey.local',
                'user_type' => 'publisher',
                'login_uid' => 'pub_' . Str::lower(Str::random(10)),
            ]);
        }

        if (Survey::query()->where('user_id', $publisher->id)->where('title', self::TITLE)->exists()) {
            return;
        }

        DB::transaction(function () use ($publisher): void {
            $survey = Survey::query()->create([
                'user_id' => $publisher->id,
                'title' => self::TITLE,
                'description' => 'Sample publisher survey for testing lists, charts, and member flows.',
                'status' => 'active',
                'member_tier' => Survey::TIER_FREE,
                'target_audience' => [
                    'region' => 'India — all',
                    'ageBand' => '18–44',
                    'category' => 'Brand',
                ],
            ]);

            $blocks = [
                [
                    'question_key' => 'satisfaction',
                    'type' => 'rating',
                    'label' => 'How satisfied are you with our brand?',
                    'description' => null,
                    'required' => true,
                    'options' => [],
                    'min_rating' => 1,
                    'max_rating' => 5,
                    'logic' => null,
                    'sort_order' => 0,
                ],
                [
                    'question_key' => 'heard_about',
                    'type' => 'multiple_choice',
                    'label' => 'Where did you hear about us?',
                    'description' => null,
                    'required' => false,
                    'options' => ['Social media', 'Friend', 'Advertisement', 'Other'],
                    'min_rating' => null,
                    'max_rating' => null,
                    'logic' => null,
                    'sort_order' => 1,
                ],
                [
                    'question_key' => 'feedback',
                    'type' => 'text',
                    'label' => 'Any additional feedback?',
                    'description' => null,
                    'required' => false,
                    'options' => [],
                    'min_rating' => null,
                    'max_rating' => null,
                    'logic' => null,
                    'sort_order' => 2,
                ],
            ];

            foreach ($blocks as $row) {
                SurveyQuestion::query()->create([
                    'survey_id' => $survey->id,
                    ...$row,
                ]);
            }
        });
    }
}

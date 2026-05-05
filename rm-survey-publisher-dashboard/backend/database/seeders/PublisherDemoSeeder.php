<?php

namespace Database\Seeders;

use App\Models\Survey;
use App\Models\SurveyQuestion;
use App\Models\SurveyResponse;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PublisherDemoSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->firstOrCreate(
            ['email' => 'publisher@demo.local'],
            [
                'name' => 'Demo Publisher',
                'password' => Hash::make('password'),
                'role' => 'publisher',
                'company' => 'RM Demo Co.',
                'payment_details' => ['upi' => 'demo@upi'],
                'notification_prefs' => [
                    'email' => true,
                    'push' => true,
                    'earnings' => true,
                    'surveyComplete' => true,
                ],
            ]
        );

        Wallet::query()->firstOrCreate(
            ['user_id' => $user->id],
            ['balance' => 12.50, 'currency' => 'USD']
        );

        $survey = Survey::query()->firstOrCreate(
            ['user_id' => $user->id, 'title' => 'Product satisfaction pulse'],
            [
                'description' => 'Short demo survey',
                'status' => 'active',
                'response_count' => 0,
                'earnings_total' => 0,
                'target_audience' => ['ageMin' => 18, 'ageMax' => 55],
            ]
        );

        if ($survey->questions()->count() === 0) {
            SurveyQuestion::query()->create([
                'survey_id' => $survey->id,
                'question_key' => 'q_nps',
                'type' => 'rating',
                'label' => 'How likely are you to recommend us?',
                'description' => null,
                'required' => true,
                'options' => [],
                'min_rating' => 1,
                'max_rating' => 5,
                'logic' => null,
                'sort_order' => 0,
            ]);
            SurveyQuestion::query()->create([
                'survey_id' => $survey->id,
                'question_key' => 'q_feedback',
                'type' => 'text',
                'label' => 'What should we improve?',
                'required' => false,
                'options' => [],
                'logic' => null,
                'sort_order' => 1,
            ]);
        }

        if (SurveyResponse::query()->where('survey_id', $survey->id)->doesntExist()) {
            SurveyResponse::query()->create([
                'survey_id' => $survey->id,
                'user_id' => $user->id,
                'answers' => [
                    ['questionKey' => 'q_nps', 'value' => 5],
                    ['questionKey' => 'q_feedback', 'value' => 'Great UX'],
                ],
                'respondent' => ['age' => 28, 'gender' => 'female', 'location' => 'Mumbai'],
                'completed' => true,
                'drop_off_question_key' => null,
            ]);
            $survey->increment('response_count');
        }
    }
}

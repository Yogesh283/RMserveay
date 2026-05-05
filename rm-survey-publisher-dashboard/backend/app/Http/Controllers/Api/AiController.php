<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AiController extends Controller
{
    public function suggestions(Request $request)
    {
        $data = $request->validate([
            'topic' => 'required|string|max:120',
            'audience' => 'nullable|string|max:255',
        ]);

        $topic = mb_substr($data['topic'], 0, 60);
        $audience = $data['audience'] ?? null;

        return response()->json([
            'title' => $topic.' — quick pulse',
            'description' => $audience
                ? "Target: {$audience}. Gather structured feedback on {$topic}."
                : "Short survey about {$topic}.",
            'insights' => [
                'Keep the first question multiple choice to boost completion.',
                'Add a rating scale before open text to anchor sentiment.',
                'Use conditional logic to skip irrelevant sections.',
            ],
            'questions' => [
                [
                    'key' => 'q_sat',
                    'type' => 'rating',
                    'label' => "How satisfied are you with {$topic}?",
                    'required' => true,
                    'minRating' => 1,
                    'maxRating' => 5,
                ],
                [
                    'key' => 'q_freq',
                    'type' => 'multiple_choice',
                    'label' => 'How often do you interact with this topic?',
                    'required' => true,
                    'options' => ['Daily', 'Weekly', 'Monthly', 'Rarely'],
                ],
                [
                    'key' => 'q_detail',
                    'type' => 'text',
                    'label' => 'What would you improve?',
                    'required' => false,
                ],
            ],
        ]);
    }
}

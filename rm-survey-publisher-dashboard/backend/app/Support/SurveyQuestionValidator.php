<?php

namespace App\Support;

class SurveyQuestionValidator
{
    private const TYPES = ['multiple_choice', 'text', 'rating', 'yes_no', 'dropdown'];

    /**
     * @param  array<int, array<string, mixed>>  $questions
     */
    public static function assertValid(array $questions): void
    {
        if ($questions === []) {
            abort(422, 'At least one question is required');
        }

        $seen = [];
        foreach ($questions as $i => $q) {
            $key = $q['key'] ?? null;
            $type = $q['type'] ?? null;
            $label = $q['label'] ?? null;
            if (! $key || ! $type || ! $label) {
                abort(422, "Question {$i}: key, type, and label are required");
            }
            if (! in_array($type, self::TYPES, true)) {
                abort(422, "Question {$key}: invalid type");
            }
            if (isset($seen[$key])) {
                abort(422, "Duplicate question key: {$key}");
            }
            $seen[$key] = true;

            if (in_array($type, ['multiple_choice', 'dropdown'], true)) {
                $opts = $q['options'] ?? [];
                if (! is_array($opts) || $opts === []) {
                    abort(422, "Question {$key}: options required for {$type}");
                }
            }
        }
    }
}

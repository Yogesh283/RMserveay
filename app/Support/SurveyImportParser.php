<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Parses pasted survey text into a structured payload.
 *
 * Supports formats like:
 *
 *     🚗 RM Survey AI – New Car Launch Survey
 *     कृपया नीचे दिए गए ... (description)
 *
 *     1️⃣ आपके पास किस ब्रांड की कार है?
 *     Maruti Suzuki
 *     Hyundai
 *     Other
 *
 *     2. Question text
 *     - Option A
 *     - Option B
 *
 * Output: ['title' => string, 'description' => string|null, 'questions' => [
 *     ['key' => '...', 'type' => 'single_choice|multi_choice|rating|text|textarea',
 *      'label' => '...', 'options' => [['value' => '...','label' => '...']],
 *      'min_rating' => ?int, 'max_rating' => ?int, 'sort_order' => int],
 * ]]
 */
class SurveyImportParser
{
    /** @return array{title: string, description: ?string, questions: array<int, array<string, mixed>>} */
    public function parse(string $raw, ?string $titleOverride = null, ?string $descriptionOverride = null): array
    {
        $lines = $this->splitLines($raw);
        $blocks = $this->groupBlocks($lines);

        $title = $titleOverride !== null && trim($titleOverride) !== '' ? trim($titleOverride) : null;
        $description = $descriptionOverride !== null && trim($descriptionOverride) !== '' ? trim($descriptionOverride) : null;

        $questions = [];
        $usedKeys = [];

        $preludeLines = [];
        foreach ($blocks as $block) {
            $first = $block[0] ?? '';
            if ($this->isQuestionLine($first)) {
                break;
            }
            $preludeLines = array_merge($preludeLines, $block);
        }

        if ($title === null) {
            foreach ($preludeLines as $line) {
                $candidate = $this->stripLeadingDecor(trim($line));
                if ($candidate !== '' && ! $this->isThanksLine($candidate)) {
                    $title = $candidate;
                    break;
                }
            }
        }

        if ($description === null) {
            $rest = [];
            $skipped = false;
            foreach ($preludeLines as $line) {
                $candidate = trim($line);
                if ($candidate === '') {
                    continue;
                }
                if (! $skipped) {
                    $skipped = true;
                    if ($title !== null && $this->stripLeadingDecor($candidate) === $title) {
                        continue;
                    }
                }
                if ($this->isThanksLine($candidate)) {
                    continue;
                }
                $rest[] = $candidate;
            }
            $description = $rest === [] ? null : implode("\n", $rest);
        }

        $sortOrder = 1;
        foreach ($blocks as $block) {
            if ($block === []) {
                continue;
            }
            $first = trim($block[0]);
            if (! $this->isQuestionLine($first)) {
                continue;
            }

            $label = $this->stripQuestionPrefix($first);
            $optionLines = [];
            for ($i = 1; $i < count($block); $i++) {
                $optLine = $this->stripLeadingDecor(trim($block[$i]));
                if ($optLine === '' || $this->isThanksLine($optLine)) {
                    continue;
                }
                $optionLines[] = $optLine;
            }

            $type = $this->detectType($label, $optionLines);
            $key = $this->makeUniqueKey($label, $sortOrder, $usedKeys);
            $usedKeys[$key] = true;

            $entry = [
                'key' => $key,
                'type' => $type,
                'label' => $label,
                'options' => [],
                'min_rating' => null,
                'max_rating' => null,
                'sort_order' => $sortOrder,
            ];

            if (in_array($type, ['single_choice', 'multi_choice'], true)) {
                $entry['options'] = $this->buildOptions($optionLines);
            } elseif ($type === 'rating') {
                [$min, $max] = $this->detectRatingRange($label, $optionLines);
                $entry['min_rating'] = $min;
                $entry['max_rating'] = $max;
            }

            $questions[] = $entry;
            $sortOrder++;
        }

        return [
            'title' => $title ?? 'Untitled survey',
            'description' => $description,
            'questions' => $questions,
        ];
    }

    /** @return array<int, string> */
    private function splitLines(string $raw): array
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $raw);

        return explode("\n", $normalized);
    }

    /**
     * Group lines into blocks separated by blank lines OR by a new question line.
     *
     * @param  array<int, string>  $lines
     * @return array<int, array<int, string>>
     */
    private function groupBlocks(array $lines): array
    {
        $blocks = [];
        $current = [];

        foreach ($lines as $line) {
            $trim = trim($line);
            if ($trim === '') {
                if ($current !== []) {
                    $blocks[] = $current;
                    $current = [];
                }

                continue;
            }

            if ($this->isQuestionLine($trim) && $current !== []) {
                $blocks[] = $current;
                $current = [];
            }

            $current[] = $line;
        }

        if ($current !== []) {
            $blocks[] = $current;
        }

        return $blocks;
    }

    private function isQuestionLine(string $line): bool
    {
        $trim = trim($line);
        if ($trim === '') {
            return false;
        }

        if (preg_match('/^([0-9]+)[\.\)]\s*\S/u', $trim) === 1) {
            return true;
        }
        if (preg_match('/^Q\s*([0-9]+)\s*[:\.]\s*\S/iu', $trim) === 1) {
            return true;
        }
        if (preg_match('/^([0-9]+)[\x{FE0F}]?[\x{20E3}]\s*\S/u', $trim) === 1) {
            return true;
        }
        if (preg_match('/^[\x{1F51F}]\s*\S/u', $trim) === 1) {
            return true;
        }

        return false;
    }

    private function stripQuestionPrefix(string $line): string
    {
        $line = trim($line);
        $line = preg_replace('/^([0-9]+)[\.\)]\s*/u', '', $line);
        $line = preg_replace('/^Q\s*([0-9]+)\s*[:\.]\s*/iu', '', $line);
        $line = preg_replace('/^([0-9]+)[\x{FE0F}]?[\x{20E3}]\s*/u', '', $line);
        $line = preg_replace('/^[\x{1F51F}]\s*/u', '', $line);

        return trim((string) $line);
    }

    private function stripLeadingDecor(string $line): string
    {
        $line = trim($line);
        $line = preg_replace('/^[\-\*\x{2022}\x{2013}\x{2014}\x{25E6}\x{2043}]\s*/u', '', $line);
        $line = preg_replace('/^[\(\[]?\s*[a-zA-Z][\)\.\]]\s+/u', '', (string) $line);

        return trim((string) $line);
    }

    private function isThanksLine(string $line): bool
    {
        $clean = mb_strtolower($line);
        if (str_contains($clean, 'thank')) {
            return true;
        }
        if (str_contains($line, 'धन्यवाद')) {
            return true;
        }
        if (str_contains($line, '🙏')) {
            return true;
        }

        return false;
    }

    /**
     * @param  array<int, string>  $optionLines
     */
    private function detectType(string $label, array $optionLines): string
    {
        $lc = mb_strtolower($label);

        if (preg_match('/\brate\b|\brating\b|1\s*[-–]\s*5|1\s*[-–]\s*10/iu', $label) === 1) {
            return 'rating';
        }

        if (count($optionLines) >= 2) {
            if (str_contains($lc, 'select all') || str_contains($lc, 'choose all') || str_contains($lc, 'all that apply')) {
                return 'multi_choice';
            }

            return 'single_choice';
        }

        if (mb_strlen($label) > 80) {
            return 'textarea';
        }

        return 'text';
    }

    /**
     * @param  array<int, string>  $optionLines
     * @return array{0: int, 1: int}
     */
    private function detectRatingRange(string $label, array $optionLines): array
    {
        if (preg_match('/(\d+)\s*[-–]\s*(\d+)/u', $label, $m) === 1) {
            return [(int) $m[1], (int) $m[2]];
        }
        if ($optionLines !== []) {
            $nums = array_filter(array_map(fn ($l) => is_numeric(trim($l)) ? (int) trim($l) : null, $optionLines), fn ($v) => $v !== null);
            if ($nums !== []) {
                return [min($nums), max($nums)];
            }
        }

        return [1, 5];
    }

    /**
     * @param  array<int, string>  $lines
     * @return array<int, array{value: string, label: string}>
     */
    private function buildOptions(array $lines): array
    {
        $opts = [];
        $usedValues = [];
        foreach ($lines as $label) {
            $clean = trim($label);
            if ($clean === '') {
                continue;
            }
            $value = $this->slugify($clean);
            if ($value === '') {
                $value = 'opt_'.(count($opts) + 1);
            }
            $base = $value;
            $i = 1;
            while (isset($usedValues[$value])) {
                $i++;
                $value = $base.'_'.$i;
            }
            $usedValues[$value] = true;

            $opts[] = ['value' => $value, 'label' => $clean];
        }

        return $opts;
    }

    /** @param  array<string, bool>  $used */
    private function makeUniqueKey(string $label, int $position, array $used): string
    {
        $base = $this->slugify($label);
        if ($base === '' || strlen($base) > 48) {
            $base = 'q'.$position;
        }
        $key = $base;
        $i = 1;
        while (isset($used[$key])) {
            $i++;
            $key = $base.'_'.$i;
        }

        return $key;
    }

    private function slugify(string $value): string
    {
        $ascii = Str::slug($value, '_');
        if ($ascii !== '' && $ascii !== '-') {
            return Str::limit($ascii, 48, '');
        }

        $hash = substr(md5($value), 0, 8);

        return 'opt_'.$hash;
    }
}

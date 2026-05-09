<?php

namespace App\Filament\Admin\Resources\SurveyQuestions\Schemas;

use App\Models\Survey;
use Filament\Forms\Components\Radio;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class SurveyQuestionForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Question basics')
                    ->description('Konsi survey ke liye question hai aur kya pucha jayega.')
                    ->icon('heroicon-o-question-mark-circle')
                    ->columns(2)
                    ->schema([
                        Select::make('survey_id')
                            ->label('Survey')
                            ->required()
                            ->native(false)
                            ->searchable()
                            ->options(fn (): array => Survey::query()
                                ->orderByDesc('id')
                                ->limit(500)
                                ->get(['id', 'title', 'status', 'member_tier'])
                                ->mapWithKeys(fn (Survey $s): array => [
                                    $s->id => '#'.$s->id.' · ['.strtoupper($s->status).'] · '
                                        .Survey::tierLabel($s->member_tier).' — '.($s->title ?: 'Untitled'),
                                ])
                                ->all())
                            ->getOptionLabelUsing(function ($value): ?string {
                                $s = Survey::query()->find($value);

                                return $s ? '#'.$s->id.' · ['.strtoupper($s->status).'] · '
                                    .Survey::tierLabel($s->member_tier).' — '.($s->title ?: 'Untitled') : null;
                            })
                            ->columnSpanFull(),

                        Radio::make('type')
                            ->label('Question type')
                            ->required()
                            ->default('single_choice')
                            ->options([
                                'single_choice' => 'Single choice (radio)',
                                'multi_choice' => 'Multi choice (checkboxes)',
                                'rating' => 'Rating (stars / score)',
                                'text' => 'Short text',
                                'textarea' => 'Long text (paragraph)',
                                'email' => 'Email',
                                'number' => 'Number',
                            ])
                            ->descriptions([
                                'single_choice' => 'Sirf 1 option choose hoga. Niche "Options" me JSON do.',
                                'multi_choice' => 'Multiple options choose ho sakte hain. JSON do.',
                                'rating' => 'Star/score (e.g. 1-5). Min/Max rating bharna.',
                                'text' => 'Single line answer.',
                                'textarea' => 'Free-form long text.',
                                'email' => 'Email validation auto.',
                                'number' => 'Sirf numbers.',
                            ])
                            ->columnSpanFull(),

                        TextInput::make('question_key')
                            ->label('Question key (unique per survey)')
                            ->required()
                            ->placeholder('e.g. q1, age_group, freq_buy')
                            ->helperText('Sirf small letters, digits, underscore. Spaces nahi.')
                            ->maxLength(64)
                            ->regex('/^[a-z0-9_]+$/'),

                        TextInput::make('sort_order')
                            ->label('Order (1 = sabse pehle)')
                            ->required()
                            ->numeric()
                            ->minValue(0)
                            ->default(1),
                    ]),

                Section::make('Question content')
                    ->description('Member ko kya dikhega.')
                    ->icon('heroicon-o-pencil-square')
                    ->columns(1)
                    ->schema([
                        TextInput::make('label')
                            ->label('Question text')
                            ->required()
                            ->placeholder('e.g. How often do you shop online?')
                            ->columnSpanFull(),

                        Textarea::make('description')
                            ->label('Helper / hint text (optional)')
                            ->rows(2)
                            ->columnSpanFull(),

                        Toggle::make('required')
                            ->label('Required (member ko bharna mandatory)')
                            ->default(true)
                            ->inline(false),
                    ]),

                Section::make('Choice options (single_choice / multi_choice ke liye)')
                    ->description('JSON array do — har item: {"value":"...","label":"..."}')
                    ->icon('heroicon-o-list-bullet')
                    ->collapsible()
                    ->columns(1)
                    ->schema([
                        Textarea::make('options')
                            ->label('')
                            ->rows(6)
                            ->placeholder('[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"monthly","label":"Monthly"}]')
                            ->helperText('Filament JSON ko array me cast kar deta hai. Single/multi choice na ho to khali chhod do.')
                            ->columnSpanFull(),
                    ]),

                Section::make('Rating range (sirf type = rating)')
                    ->description('Min aur max value (e.g. 1 se 5).')
                    ->icon('heroicon-o-star')
                    ->collapsible()
                    ->collapsed()
                    ->columns(2)
                    ->schema([
                        TextInput::make('min_rating')
                            ->label('Min rating')
                            ->numeric()
                            ->minValue(0)
                            ->maxValue(20)
                            ->placeholder('1'),

                        TextInput::make('max_rating')
                            ->label('Max rating')
                            ->numeric()
                            ->minValue(1)
                            ->maxValue(20)
                            ->placeholder('5'),
                    ]),

                Section::make('Conditional logic (advanced, optional)')
                    ->description('JSON ya khali chhod do.')
                    ->icon('heroicon-o-cog-6-tooth')
                    ->collapsible()
                    ->collapsed()
                    ->columns(1)
                    ->schema([
                        Textarea::make('logic')
                            ->label('')
                            ->rows(3)
                            ->placeholder('{"showIf":{"questionKey":"q1","equals":"yes"}}')
                            ->columnSpanFull(),
                    ]),
            ]);
    }
}

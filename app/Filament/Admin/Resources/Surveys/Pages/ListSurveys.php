<?php

namespace App\Filament\Admin\Resources\Surveys\Pages;

use App\Filament\Admin\Resources\Surveys\SurveyResource;
use App\Models\Survey;
use App\Models\SurveyQuestion;
use App\Models\User;
use App\Support\SurveyImportParser;
use Filament\Actions\Action;
use Filament\Actions\CreateAction;
use Filament\Forms\Components\Radio;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ListRecords;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Throwable;

class ListSurveys extends ListRecords
{
    protected static string $resource = SurveyResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('bulkImport')
                ->label('Bulk paste import')
                ->icon('heroicon-o-clipboard-document-list')
                ->color('success')
                ->modalHeading('Paste full survey content')
                ->modalDescription('Title, description aur saare questions (with options) ek hi textarea me paste karo. Hum auto-detect karke Survey + saare Questions bana denge.')
                ->modalSubmitActionLabel('Create survey + questions')
                ->modalWidth('5xl')
                ->schema([
                    TextInput::make('title')
                        ->label('Title (optional — agar khali, to text ki pehli line se uthayenge)')
                        ->maxLength(255)
                        ->columnSpanFull(),

                    Textarea::make('description')
                        ->label('Description (optional)')
                        ->rows(2)
                        ->columnSpanFull(),

                    Radio::make('member_tier')
                        ->label('Send to')
                        ->required()
                        ->default(Survey::TIER_FREE)
                        ->options(Survey::tierOptions())
                        ->columnSpanFull(),

                    Radio::make('status')
                        ->label('Status')
                        ->inline()
                        ->required()
                        ->default('active')
                        ->options([
                            'draft' => 'Draft',
                            'active' => 'Active',
                            'inactive' => 'Inactive',
                        ])
                        ->columnSpanFull(),

                    Textarea::make('bulk_text')
                        ->label('Paste full survey content (title, description, all questions with options)')
                        ->required()
                        ->rows(20)
                        ->placeholder("Example:\n\n🚗 RM Survey AI – New Car Launch Survey\nNote: सभी प्रश्न वैकल्पिक हैं।\n\n1️⃣ आपके पास किस ब्रांड की कार है?\nMaruti Suzuki\nHyundai\nTata Motors\nMahindra\nOther\n\n2️⃣ आप किस प्रकार की कार पसंद करते हैं?\nHatchback\nSedan\nSUV\n…")
                        ->helperText('Format: question line (numbered like 1️⃣ ya 1.) ke neeche options ek-ek line me. Blank line se questions separate hote hain.')
                        ->columnSpanFull(),
                ])
                ->action(function (array $data): void {
                    $this->handleBulkImport($data);
                }),

            CreateAction::make(),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function handleBulkImport(array $data): void
    {
        $parser = app(SurveyImportParser::class);

        $parsed = $parser->parse(
            (string) ($data['bulk_text'] ?? ''),
            $data['title'] ?? null,
            $data['description'] ?? null,
        );

        if ($parsed['questions'] === []) {
            Notification::make()
                ->title('Koi question detect nahi hua')
                ->body('Sahi format me paste karo: numbered question lines (1. or 1️⃣) ke neeche options ek-ek line me.')
                ->danger()
                ->send();

            return;
        }

        try {
            $survey = DB::transaction(function () use ($parsed, $data): Survey {
                $survey = Survey::query()->create([
                    'user_id' => $this->resolveOwnerId(),
                    'title' => $parsed['title'],
                    'description' => $parsed['description'],
                    'status' => $data['status'] ?? 'active',
                    'member_tier' => $data['member_tier'] ?? Survey::TIER_FREE,
                    'response_count' => 0,
                    'earnings_total' => 0,
                ]);

                foreach ($parsed['questions'] as $q) {
                    SurveyQuestion::query()->create([
                        'survey_id' => $survey->id,
                        'question_key' => $q['key'],
                        'type' => $q['type'],
                        'label' => $q['label'],
                        'description' => null,
                        'required' => false,
                        'options' => $q['options'] ?? [],
                        'min_rating' => $q['min_rating'] ?? null,
                        'max_rating' => $q['max_rating'] ?? null,
                        'logic' => null,
                        'sort_order' => (int) ($q['sort_order'] ?? 0),
                    ]);
                }

                return $survey;
            });
        } catch (Throwable $e) {
            Notification::make()
                ->title('Survey create failed')
                ->body($e->getMessage())
                ->danger()
                ->send();

            return;
        }

        Notification::make()
            ->title('Survey + '.count($parsed['questions']).' questions created')
            ->body('Survey #'.$survey->id.' — '.$survey->title)
            ->success()
            ->send();

        $this->redirect(SurveyResource::getUrl('edit', ['record' => $survey->id]));
    }

    private function resolveOwnerId(): int
    {
        $authId = Auth::id();
        if ($authId !== null && User::query()->whereKey($authId)->exists()) {
            return (int) $authId;
        }

        $publisherId = User::query()->where('user_type', 'publisher')->orderBy('id')->value('id');
        if ($publisherId !== null) {
            return (int) $publisherId;
        }

        $anyId = User::query()->orderBy('id')->value('id');

        return (int) ($anyId ?? 1);
    }
}

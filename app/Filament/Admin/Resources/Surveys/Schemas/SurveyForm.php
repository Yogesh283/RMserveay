<?php

namespace App\Filament\Admin\Resources\Surveys\Schemas;

use App\Models\Survey;
use App\Models\User;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Schemas\Schema;

class SurveyForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('user_id')
                    ->label('Publisher (owner)')
                    ->required()
                    ->native(false)
                    ->searchable()
                    ->preload()
                    ->helperText('Survey kis publisher ke account me banegi. Sirf publisher accounts hi list me aate hain.')
                    ->getSearchResultsUsing(fn (string $search): array => User::query()
                        ->where('user_type', 'publisher')
                        ->where(function ($q) use ($search) {
                            $q->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%")
                                ->orWhere('id', $search);
                        })
                        ->limit(50)
                        ->get()
                        ->mapWithKeys(fn (User $u) => [
                            $u->id => trim(($u->name ?: 'User').' · '.$u->email.' (#'.$u->id.')'),
                        ])
                        ->all())
                    ->getOptionLabelUsing(function ($value): ?string {
                        $u = User::query()->find($value);

                        return $u ? trim(($u->name ?: 'User').' · '.$u->email.' (#'.$u->id.')') : null;
                    })
                    ->options(fn () => User::query()
                        ->where('user_type', 'publisher')
                        ->orderByDesc('id')
                        ->limit(50)
                        ->get()
                        ->mapWithKeys(fn (User $u) => [
                            $u->id => trim(($u->name ?: 'User').' · '.$u->email.' (#'.$u->id.')'),
                        ])
                        ->all())
                    ->rule('exists:users,id'),
                TextInput::make('title')
                    ->required(),
                Textarea::make('description')
                    ->default(null)
                    ->columnSpanFull(),
                Select::make('status')
                    ->required()
                    ->default('draft')
                    ->native(false)
                    ->options([
                        'draft' => 'Draft',
                        'active' => 'Active',
                        'inactive' => 'Inactive',
                    ]),
                Select::make('member_tier')
                    ->label('Survey for')
                    ->required()
                    ->default(Survey::TIER_FREE)
                    ->native(false)
                    ->searchable()
                    ->options(Survey::tierOptions())
                    ->helperText('Pick which member tier should receive this survey: Free (everyone), Active Panel ($11 panelists), Sub Panel ($10 panel buyers), or Super Panel ($100 panel buyers).'),
                TextInput::make('response_count')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('earnings_total')
                    ->required()
                    ->numeric()
                    ->default(0.0),
                Textarea::make('target_audience')
                    ->default(null)
                    ->columnSpanFull(),
            ]);
    }
}

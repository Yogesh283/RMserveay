<?php

namespace App\Filament\Admin\Resources\Surveys\Schemas;

use App\Models\Survey;
use Filament\Forms\Components\Radio;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class SurveyForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Survey content')
                    ->description('Title aur description seedha paste kar do — yahi members ko dikhega.')
                    ->icon('heroicon-o-pencil-square')
                    ->columns(1)
                    ->schema([
                        TextInput::make('title')
                            ->label('Title')
                            ->required()
                            ->maxLength(255)
                            ->placeholder('e.g. 5-min feedback on your shopping habits')
                            ->columnSpanFull(),
                        Textarea::make('description')
                            ->label('Description (members ko kya bataana hai)')
                            ->placeholder("Yahan paste karo: kis baare me hai, kitni der lagegi, koi instruction…")
                            ->rows(5)
                            ->autosize()
                            ->columnSpanFull(),
                    ]),

                Section::make('Kis ko bhejna hai?')
                    ->description('Sirf eligible tier ke members ko hi survey dikhegi.')
                    ->icon('heroicon-o-users')
                    ->columns(1)
                    ->schema([
                        Radio::make('member_tier')
                            ->label('Send to')
                            ->required()
                            ->default(Survey::TIER_FREE)
                            ->options(Survey::tierOptions())
                            ->descriptions([
                                Survey::TIER_FREE => 'Sirf inactive members (jin ka active panel paid nahi) fill kar sakte hain.',
                                Survey::TIER_PANEL => 'Sirf $11 active panelist ($1 activation + $10 panel paid) members.',
                                Survey::TIER_SUB_PANEL => 'Sirf jinhone $10 wala Sub Panel kharida ho (≥1).',
                                Survey::TIER_SUPER_PANEL => 'Sirf jinhone $100 wala Super Panel kharida ho (≥1).',
                            ])
                            ->columnSpanFull(),

                        Radio::make('status')
                            ->label('Status')
                            ->inline()
                            ->required()
                            ->default('draft')
                            ->options([
                                'draft' => 'Draft',
                                'active' => 'Active',
                                'inactive' => 'Inactive',
                            ])
                            ->descriptions([
                                'draft' => 'Chhupa hua — abhi koi nahi dekhta.',
                                'active' => 'Live — members fill kar sakte hain, responses count honge.',
                                'inactive' => 'Paused — naye responses nahi liye jate.',
                            ])
                            ->columnSpanFull(),
                    ]),

                Section::make('Target audience (optional)')
                    ->description('Demographic notes ya extra targeting JSON. Khali chhod do agar zaroorat nahi.')
                    ->icon('heroicon-o-funnel')
                    ->collapsible()
                    ->collapsed()
                    ->columns(1)
                    ->schema([
                        Textarea::make('target_audience')
                            ->label('')
                            ->placeholder('e.g. {"age_min": 18, "age_max": 35, "country": "IN"}')
                            ->rows(3)
                            ->columnSpanFull(),
                    ]),
            ]);
    }
}

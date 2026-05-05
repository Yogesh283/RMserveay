<?php

namespace App\Filament\Admin\Resources\Surveys;

use App\Filament\Admin\Resources\Surveys\Pages\CreateSurvey;
use App\Filament\Admin\Resources\Surveys\Pages\EditSurvey;
use App\Filament\Admin\Resources\Surveys\Pages\ListSurveys;
use App\Filament\Admin\Resources\Surveys\Pages\ViewSurvey;
use App\Filament\Admin\Resources\Surveys\Schemas\SurveyForm;
use App\Filament\Admin\Resources\Surveys\Schemas\SurveyInfolist;
use App\Filament\Admin\Resources\Surveys\Tables\SurveysTable;
use App\Models\Survey;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class SurveyResource extends Resource
{
    protected static ?string $model = Survey::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    public static function form(Schema $schema): Schema
    {
        return SurveyForm::configure($schema);
    }

    public static function infolist(Schema $schema): Schema
    {
        return SurveyInfolist::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return SurveysTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListSurveys::route('/'),
            'create' => CreateSurvey::route('/create'),
            'view' => ViewSurvey::route('/{record}'),
            'edit' => EditSurvey::route('/{record}/edit'),
        ];
    }
}

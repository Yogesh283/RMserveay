<?php

namespace App\Filament\Admin\Resources\ActivePanelUsers;

use App\Filament\Admin\Resources\ActivePanelUsers\Pages\ListActivePanelUsers;
use App\Filament\Admin\Resources\ActivePanelUsers\Tables\ActivePanelUsersTable;
use App\Models\ActivePanelUser;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;
use UnitEnum;

class ActivePanelUserResource extends Resource
{
    protected static ?string $model = ActivePanelUser::class;

    protected static ?string $navigationLabel = 'Active panelists';

    protected static string|UnitEnum|null $navigationGroup = 'Reports';

    protected static ?int $navigationSort = 1;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedUserGroup;

    public static function form(Schema $schema): Schema
    {
        return $schema;
    }

    public static function table(Table $table): Table
    {
        return ActivePanelUsersTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListActivePanelUsers::route('/'),
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function canDelete(Model $record): bool
    {
        return false;
    }
}

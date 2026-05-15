<?php

namespace App\Filament\Admin\Resources\SubPanelUsers;

use App\Filament\Admin\Resources\SubPanelUsers\Pages\CreateSubPanelUser;
use App\Filament\Admin\Resources\SubPanelUsers\Pages\EditSubPanelUser;
use App\Filament\Admin\Resources\SubPanelUsers\Pages\ListSubPanelUsers;
use App\Filament\Admin\Resources\SubPanelUsers\Schemas\SubPanelUserForm;
use App\Filament\Admin\Resources\SubPanelUsers\Tables\SubPanelUsersTable;
use App\Models\SubPanelUser;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use UnitEnum;

class SubPanelUserResource extends Resource
{
    protected static ?string $model = SubPanelUser::class;

    protected static ?string $navigationLabel = 'Sub panel users';

    protected static string|UnitEnum|null $navigationGroup = 'Panel enrollments';

    protected static ?int $navigationSort = 2;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedSquares2x2;

    public static function form(Schema $schema): Schema
    {
        return SubPanelUserForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return SubPanelUsersTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListSubPanelUsers::route('/'),
            'create' => CreateSubPanelUser::route('/create'),
            'edit' => EditSubPanelUser::route('/{record}/edit'),
        ];
    }
}

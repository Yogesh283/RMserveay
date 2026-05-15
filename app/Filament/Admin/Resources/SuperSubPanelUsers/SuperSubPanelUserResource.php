<?php

namespace App\Filament\Admin\Resources\SuperSubPanelUsers;

use App\Filament\Admin\Resources\SuperSubPanelUsers\Pages\CreateSuperSubPanelUser;
use App\Filament\Admin\Resources\SuperSubPanelUsers\Pages\EditSuperSubPanelUser;
use App\Filament\Admin\Resources\SuperSubPanelUsers\Pages\ListSuperSubPanelUsers;
use App\Filament\Admin\Resources\SuperSubPanelUsers\Schemas\SuperSubPanelUserForm;
use App\Filament\Admin\Resources\SuperSubPanelUsers\Tables\SuperSubPanelUsersTable;
use App\Models\SuperSubPanelUser;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use UnitEnum;

class SuperSubPanelUserResource extends Resource
{
    protected static ?string $model = SuperSubPanelUser::class;

    protected static ?string $navigationLabel = 'Super sub panel users';

    protected static string|UnitEnum|null $navigationGroup = 'Panel enrollments';

    protected static ?int $navigationSort = 3;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedSquaresPlus;

    public static function form(Schema $schema): Schema
    {
        return SuperSubPanelUserForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return SuperSubPanelUsersTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListSuperSubPanelUsers::route('/'),
            'create' => CreateSuperSubPanelUser::route('/create'),
            'edit' => EditSuperSubPanelUser::route('/{record}/edit'),
        ];
    }
}

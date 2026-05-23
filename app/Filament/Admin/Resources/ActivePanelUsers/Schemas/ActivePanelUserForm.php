<?php

namespace App\Filament\Admin\Resources\ActivePanelUsers\Schemas;

use App\Filament\Admin\Support\AdminUserTableColumns;
use App\Models\User;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class ActivePanelUserForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('user_id')
                    ->relationship('user', 'name')
                    ->getOptionLabelFromRecordUsing(
                        fn (User $record): string => AdminUserTableColumns::selectOptionLabel($record)
                    )
                    ->searchable(['id', 'login_uid', 'name', 'email'])
                    ->required()
                    ->unique(ignoreRecord: true),
                DateTimePicker::make('activated_at')
                    ->required(),
                TextInput::make('total_paid_usd')
                    ->label('Total paid (USD)')
                    ->numeric()
                    ->default('10.00')
                    ->required(),
            ]);
    }
}

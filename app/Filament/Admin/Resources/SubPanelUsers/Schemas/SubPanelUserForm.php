<?php

namespace App\Filament\Admin\Resources\SubPanelUsers\Schemas;

use App\Models\User;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class SubPanelUserForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('user_id')
                    ->relationship('user', 'name')
                    ->getOptionLabelFromRecordUsing(
                        fn (User $record): string => trim(($record->login_uid ?? '#'.$record->id).' — '.($record->name ?? ''))
                    )
                    ->searchable(['login_uid', 'name', 'email'])
                    ->required()
                    ->unique(ignoreRecord: true),
                TextInput::make('panels_count')
                    ->label('Panels count')
                    ->numeric()
                    ->minValue(1)
                    ->default(1)
                    ->required(),
                DateTimePicker::make('first_purchased_at'),
                DateTimePicker::make('last_purchased_at'),
                TextInput::make('total_paid_usd')
                    ->label('Total paid (USD)')
                    ->numeric()
                    ->default('0.00')
                    ->required(),
            ]);
    }
}

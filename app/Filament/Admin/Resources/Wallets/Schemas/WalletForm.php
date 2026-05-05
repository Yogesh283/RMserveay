<?php

namespace App\Filament\Admin\Resources\Wallets\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class WalletForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('user_id')
                    ->relationship('user', 'name')
                    ->required(),
                TextInput::make('wallet_balance')
                    ->required()
                    ->numeric()
                    ->default(0.0),
                TextInput::make('p2p_wallet_balance')
                    ->required()
                    ->numeric()
                    ->default(0.0),
            ]);
    }
}

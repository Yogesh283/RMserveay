<?php

namespace App\Filament\Admin\Resources\NowPaymentIntents\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class NowPaymentIntentForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('user_id')
                    ->relationship('user', 'name')
                    ->required(),
                TextInput::make('order_id')
                    ->required(),
                TextInput::make('payment_id')
                    ->default(null),
                TextInput::make('amount_usd')
                    ->required()
                    ->numeric(),
                TextInput::make('pay_currency')
                    ->default(null),
                TextInput::make('pay_amount')
                    ->numeric()
                    ->default(null),
                TextInput::make('pay_address')
                    ->default(null),
                TextInput::make('payment_status')
                    ->required()
                    ->default('waiting'),
                Toggle::make('credited')
                    ->required(),
                TextInput::make('payin_hash')
                    ->default(null),
            ]);
    }
}

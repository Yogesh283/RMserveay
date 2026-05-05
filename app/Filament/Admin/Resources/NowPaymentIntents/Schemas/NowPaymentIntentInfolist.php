<?php

namespace App\Filament\Admin\Resources\NowPaymentIntents\Schemas;

use Filament\Infolists\Components\IconEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Schema;

class NowPaymentIntentInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextEntry::make('user.name')
                    ->label('User'),
                TextEntry::make('order_id'),
                TextEntry::make('payment_id')
                    ->placeholder('-'),
                TextEntry::make('amount_usd')
                    ->numeric(),
                TextEntry::make('pay_currency')
                    ->placeholder('-'),
                TextEntry::make('pay_amount')
                    ->numeric()
                    ->placeholder('-'),
                TextEntry::make('pay_address')
                    ->placeholder('-'),
                TextEntry::make('payment_status'),
                IconEntry::make('credited')
                    ->boolean(),
                TextEntry::make('payin_hash')
                    ->placeholder('-'),
                TextEntry::make('created_at')
                    ->dateTime()
                    ->placeholder('-'),
                TextEntry::make('updated_at')
                    ->dateTime()
                    ->placeholder('-'),
            ]);
    }
}

<?php

namespace App\Filament\Admin\Resources\WithdrawalRequests\Schemas;

use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class WithdrawalRequestInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Member')
                    ->schema([
                        TextEntry::make('user.login_uid')->label('User ID'),
                        TextEntry::make('user.name'),
                        TextEntry::make('user.email'),
                        TextEntry::make('user.phone')->label('Mobile')->placeholder('—'),
                    ])
                    ->columns(2),
                Section::make('Withdrawal')
                    ->schema([
                        TextEntry::make('meta.status')->label('Status')->badge(),
                        TextEntry::make('meta.gross_usd')->label('Gross (USD)'),
                        TextEntry::make('meta.fee_usd')->label('Fee (USD)'),
                        TextEntry::make('meta.net_sent_usd')->label('Net to send (USD)'),
                        TextEntry::make('meta.bep20_address')->label('BEP20 address')->copyable(),
                        TextEntry::make('meta.network')->label('Network'),
                        TextEntry::make('created_at')->dateTime()->label('Requested at'),
                    ])
                    ->columns(2),
                Section::make('NOWPayments')
                    ->schema([
                        TextEntry::make('meta.nowpayments.payout_id')->label('Payout ID')->placeholder('—'),
                        TextEntry::make('meta.nowpayments.last_status')->label('Last NP status')->placeholder('—'),
                        TextEntry::make('meta.nowpayments.currency')->label('Currency')->placeholder('—'),
                        TextEntry::make('meta.nowpayments.amount')->label('NP amount')->placeholder('—'),
                        TextEntry::make('meta.nowpayments.submitted_at')->label('Submitted at')->placeholder('—'),
                        TextEntry::make('meta.nowpayments.verified_at')->label('2FA verified at')->placeholder('—'),
                    ])
                    ->columns(2),
                Section::make('Raw meta')
                    ->schema([
                        TextEntry::make('meta')
                            ->formatStateUsing(fn ($state) => is_array($state)
                                ? json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
                                : (string) $state)
                            ->columnSpanFull(),
                    ])
                    ->collapsed(),
            ]);
    }
}

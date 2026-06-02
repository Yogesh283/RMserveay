<?php

namespace App\Filament\Admin\Resources\Users\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class UserForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required(),
                TextInput::make('email')
                    ->label('Email address')
                    ->email()
                    ->required(),
                TextInput::make('login_uid')
                    ->required(),
                DateTimePicker::make('email_verified_at'),
                DateTimePicker::make('profile_completed_at'),
                Toggle::make('survey_income_wallet_credit_enabled')
                    ->label('Credit survey income to wallet')
                    ->helperText('When off, only this member\'s survey wallet is not credited. Direct, level, panel matching, and other income stay the same; upline still earns from their surveys.')
                    ->default(true),
                TextInput::make('password')
                    ->password()
                    ->required(),
                TextInput::make('user_type')
                    ->required()
                    ->default('normal'),
                Textarea::make('profile')
                    ->default(null)
                    ->columnSpanFull(),
                TextInput::make('qualification')
                    ->default(null),
                TextInput::make('phone')
                    ->tel()
                    ->default(null),
                TextInput::make('referral_code')
                    ->default(null),
                TextInput::make('p2p_receive_code')
                    ->default(null),
                Select::make('sponsor_id')
                    ->relationship('sponsor', 'name')
                    ->default(null),
                Select::make('binary_parent_id')
                    ->relationship('binaryParent', 'name')
                    ->default(null),
                TextInput::make('binary_side')
                    ->default(null),
                TextInput::make('left_child_id')
                    ->numeric()
                    ->default(null),
                TextInput::make('right_child_id')
                    ->numeric()
                    ->default(null),
                TextInput::make('wallet_balance')
                    ->required()
                    ->numeric()
                    ->default(0.0),
                TextInput::make('p2p_wallet_balance')
                    ->required()
                    ->numeric()
                    ->default(0.0),
                TextInput::make('usdt_bep20_withdrawal_address')
                    ->default(null),
                DateTimePicker::make('activation_fee_paid_at'),
                DateTimePicker::make('minimum_panel_fee_paid_at'),
                TextInput::make('sub_panel_count')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('super_sub_panel_count')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('membership_tier')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('panel_match_carry_left')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('panel_match_carry_right')
                    ->required()
                    ->numeric()
                    ->default(0),
                DatePicker::make('spm_match_day'),
                TextInput::make('spm_cumulative_panels')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('spm_milestone_mask')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('super_panel_match_carry_left')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('super_panel_match_carry_right')
                    ->required()
                    ->numeric()
                    ->default(0),
                DatePicker::make('sspm_match_day'),
                TextInput::make('sspm_cumulative_panels')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('sspm_milestone_mask')
                    ->required()
                    ->numeric()
                    ->default(0),
            ]);
    }
}

<?php

namespace App\Filament\Admin\Resources\Users\Schemas;

use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Schema;

class UserInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextEntry::make('name'),
                TextEntry::make('email')
                    ->label('Email address'),
                TextEntry::make('login_uid'),
                TextEntry::make('email_verified_at')
                    ->dateTime()
                    ->placeholder('-'),
                TextEntry::make('profile_completed_at')
                    ->dateTime()
                    ->placeholder('-'),
                TextEntry::make('user_type'),
                TextEntry::make('profile')
                    ->placeholder('-')
                    ->columnSpanFull(),
                TextEntry::make('qualification')
                    ->placeholder('-'),
                TextEntry::make('phone')
                    ->placeholder('-'),
                TextEntry::make('referral_code')
                    ->placeholder('-'),
                TextEntry::make('p2p_receive_code')
                    ->placeholder('-'),
                TextEntry::make('sponsor.name')
                    ->label('Sponsor')
                    ->placeholder('-'),
                TextEntry::make('binaryParent.name')
                    ->label('Binary parent')
                    ->placeholder('-'),
                TextEntry::make('binary_side')
                    ->placeholder('-'),
                TextEntry::make('left_child_id')
                    ->numeric()
                    ->placeholder('-'),
                TextEntry::make('right_child_id')
                    ->numeric()
                    ->placeholder('-'),
                TextEntry::make('wallet_balance')
                    ->numeric(),
                TextEntry::make('p2p_wallet_balance')
                    ->numeric(),
                TextEntry::make('usdt_bep20_withdrawal_address')
                    ->placeholder('-'),
                TextEntry::make('activation_fee_paid_at')
                    ->dateTime()
                    ->placeholder('-'),
                TextEntry::make('minimum_panel_fee_paid_at')
                    ->dateTime()
                    ->placeholder('-'),
                TextEntry::make('sub_panel_count')
                    ->numeric(),
                TextEntry::make('super_sub_panel_count')
                    ->numeric(),
                TextEntry::make('membership_tier')
                    ->numeric(),
                TextEntry::make('panel_match_carry_left')
                    ->numeric(),
                TextEntry::make('panel_match_carry_right')
                    ->numeric(),
                TextEntry::make('spm_match_day')
                    ->date()
                    ->placeholder('-'),
                TextEntry::make('spm_cumulative_panels')
                    ->numeric(),
                TextEntry::make('spm_milestone_mask')
                    ->numeric(),
                TextEntry::make('super_panel_match_carry_left')
                    ->numeric(),
                TextEntry::make('super_panel_match_carry_right')
                    ->numeric(),
                TextEntry::make('sspm_match_day')
                    ->date()
                    ->placeholder('-'),
                TextEntry::make('sspm_cumulative_panels')
                    ->numeric(),
                TextEntry::make('sspm_milestone_mask')
                    ->numeric(),
                TextEntry::make('created_at')
                    ->dateTime()
                    ->placeholder('-'),
                TextEntry::make('updated_at')
                    ->dateTime()
                    ->placeholder('-'),
            ]);
    }
}

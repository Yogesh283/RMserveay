<?php

namespace App\Filament\Admin\Resources\Users\Schemas;

use App\Models\User;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Schema;

class UserInfolist
{
    private const MAX_TREE_DEPTH = 3;

    private static function nodeBadge(?User $user, string $side): string
    {
        if (! $user) {
            return "<span style='color:#94a3b8;'>{$side}: -</span>";
        }

        $name = e($user->name ?? '-');
        $code = e($user->login_uid ?? '#'.$user->id);

        return "<strong>{$side}</strong>: {$name} <span style='color:#94a3b8;'>({$code})</span>";
    }

    private static function buildTeamTreeHtml(User $root): string
    {
        $rootLabel = e($root->name ?? '-');
        $rootCode = e($root->login_uid ?? '#'.$root->id);

        $html = "<div style='line-height:1.55;'>";
        $html .= "<div><strong>Root</strong>: {$rootLabel} <span style='color:#94a3b8;'>({$rootCode})</span></div>";
        $html .= self::renderChildren($root, 1);
        $html .= '</div>';

        return $html;
    }

    private static function renderChildren(User $parent, int $depth): string
    {
        if ($depth > self::MAX_TREE_DEPTH) {
            return '';
        }

        $left = $parent->left_child_id ? User::query()->find($parent->left_child_id) : null;
        $right = $parent->right_child_id ? User::query()->find($parent->right_child_id) : null;

        if (! $left && ! $right) {
            return '';
        }

        $html = "<ul style='margin:6px 0 0 14px; padding-left:12px; border-left:1px solid #334155;'>";
        $html .= "<li style='margin:2px 0;'>".self::nodeBadge($left, 'L').'</li>';
        if ($left) {
            $html .= self::renderChildren($left, $depth + 1);
        }
        $html .= "<li style='margin:2px 0;'>".self::nodeBadge($right, 'R').'</li>';
        if ($right) {
            $html .= self::renderChildren($right, $depth + 1);
        }
        $html .= '</ul>';

        return $html;
    }

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
                TextEntry::make('team_structure_tree')
                    ->label('Team structure tree')
                    ->state(fn (User $record): string => self::buildTeamTreeHtml($record))
                    ->html()
                    ->columnSpanFull(),
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

<?php

namespace App\Filament\Admin\Resources\Users\Schemas;

use App\Models\User;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Schema;
use Illuminate\Support\Facades\DB;

class UserInfolist
{
    private const MAX_TREE_DEPTH = 6;

    private static function nodeBadge(?User $user, string $side): string
    {
        if (! $user) {
            return "<span style='color:#94a3b8;'>{$side}: -</span>";
        }

        $name = e($user->name ?? '-');
        $code = e(strtoupper((string) ($user->login_uid ?? '#'.$user->id)));

        return "<strong>{$side}</strong>: {$code} <span style='color:#94a3b8;'>({$name})</span>";
    }

    private static function buildTeamTreeHtml(User $root): string
    {
        $rootLabel = e(strtoupper((string) ($root->login_uid ?? '#'.$root->id)));
        $rootName = e($root->name ?? '-');

        $html = "<div style='line-height:1.55;'>";
        $html .= "<div><strong>Root</strong>: {$rootLabel} <span style='color:#94a3b8;'>({$rootName})</span></div>";
        $html .= self::renderChildren($root, 1);
        $html .= '</div>';

        return $html;
    }

    /** Count total downline on a side using a recursive walk. */
    private static function countSubtree(?int $userId): int
    {
        if (! $userId) {
            return 0;
        }
        $count = 1;
        $row = User::query()->whereKey($userId)->first(['left_child_id', 'right_child_id']);
        if (! $row) {
            return 0;
        }
        $count += self::countSubtree($row->left_child_id);
        $count += self::countSubtree($row->right_child_id);

        return $count;
    }

    /** Build a compact direct-referrals (sponsored users) HTML list. */
    private static function buildDirectReferralsHtml(User $user): string
    {
        $referrals = User::query()
            ->where('sponsor_id', $user->id)
            ->orderByDesc('id')
            ->limit(50)
            ->get(['id', 'login_uid', 'name', 'email', 'binary_side', 'wallet_balance', 'p2p_wallet_balance', 'created_at']);

        $totalDirect = User::query()->where('sponsor_id', $user->id)->count();

        if ($referrals->isEmpty()) {
            return "<div style='color:#94a3b8;'>No direct referrals yet.</div>";
        }

        $html = "<div style='line-height:1.55;'>";
        $html .= "<div style='margin-bottom:6px;'><strong>Total direct: ".$totalDirect."</strong>".($totalDirect > 50 ? " <span style='color:#94a3b8;'>(showing latest 50)</span>" : '').'</div>';
        $html .= "<table style='width:100%; border-collapse:collapse; font-size:12px;'>";
        $html .= "<thead><tr style='background:#0f172a; color:#e2e8f0;'>";
        $html .= "<th style='text-align:left; padding:6px 8px; border-bottom:1px solid #334155;'>User ID</th>";
        $html .= "<th style='text-align:left; padding:6px 8px; border-bottom:1px solid #334155;'>Name</th>";
        $html .= "<th style='text-align:left; padding:6px 8px; border-bottom:1px solid #334155;'>Email</th>";
        $html .= "<th style='text-align:left; padding:6px 8px; border-bottom:1px solid #334155;'>Side</th>";
        $html .= "<th style='text-align:right; padding:6px 8px; border-bottom:1px solid #334155;'>Main USDT</th>";
        $html .= "<th style='text-align:right; padding:6px 8px; border-bottom:1px solid #334155;'>P2P USDT</th>";
        $html .= "<th style='text-align:left; padding:6px 8px; border-bottom:1px solid #334155;'>Joined</th>";
        $html .= '</tr></thead><tbody>';
        foreach ($referrals as $r) {
            $uid = e(strtoupper((string) ($r->login_uid ?? '#'.$r->id)));
            $name = e((string) ($r->name ?? '-'));
            $email = e((string) ($r->email ?? '-'));
            $side = e(ucfirst((string) ($r->binary_side ?? '-')));
            $main = e(number_format((float) ($r->wallet_balance ?? 0), 2));
            $p2p = e(number_format((float) ($r->p2p_wallet_balance ?? 0), 2));
            $joined = e(optional($r->created_at)->format('Y-m-d') ?? '-');
            $html .= "<tr>";
            $html .= "<td style='padding:5px 8px; border-bottom:1px solid #1f2937; font-family:monospace; color:#7dd3fc;'>{$uid}</td>";
            $html .= "<td style='padding:5px 8px; border-bottom:1px solid #1f2937;'>{$name}</td>";
            $html .= "<td style='padding:5px 8px; border-bottom:1px solid #1f2937; color:#94a3b8;'>{$email}</td>";
            $html .= "<td style='padding:5px 8px; border-bottom:1px solid #1f2937;'>{$side}</td>";
            $html .= "<td style='padding:5px 8px; border-bottom:1px solid #1f2937; text-align:right; font-family:monospace;'>\${$main}</td>";
            $html .= "<td style='padding:5px 8px; border-bottom:1px solid #1f2937; text-align:right; font-family:monospace; color:#86efac;'>\${$p2p}</td>";
            $html .= "<td style='padding:5px 8px; border-bottom:1px solid #1f2937; color:#94a3b8;'>{$joined}</td>";
            $html .= '</tr>';
        }
        $html .= '</tbody></table>';
        $html .= '</div>';

        return $html;
    }

    /** Wallet summary (main + P2P + lifetime credits & debits) HTML card. */
    private static function buildWalletSummaryHtml(User $user): string
    {
        $sums = DB::table('wallet_transactions')
            ->where('user_id', $user->id)
            ->selectRaw('SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS credits, SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) AS debits, COUNT(*) AS total')
            ->first();

        $credits = number_format((float) ($sums->credits ?? 0), 2);
        $debits = number_format((float) ($sums->debits ?? 0), 2);
        $total = (int) ($sums->total ?? 0);
        $main = number_format((float) ($user->wallet_balance ?? 0), 2);
        $p2p = number_format((float) ($user->p2p_wallet_balance ?? 0), 2);

        $html = "<div style='display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px; line-height:1.4;'>";
        $html .= "<div style='padding:10px 12px; border:1px solid #334155; border-radius:8px; background:#0b1020;'><div style='font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em;'>Main wallet</div><div style='font-size:18px; font-weight:600; color:#fff;'>\${$main}</div></div>";
        $html .= "<div style='padding:10px 12px; border:1px solid #14532d; border-radius:8px; background:#052e16;'><div style='font-size:11px; color:#86efac; text-transform:uppercase; letter-spacing:0.08em;'>P2P wallet</div><div style='font-size:18px; font-weight:600; color:#86efac;'>\${$p2p}</div></div>";
        $html .= "<div style='padding:10px 12px; border:1px solid #334155; border-radius:8px; background:#0b1020;'><div style='font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em;'>Lifetime credits</div><div style='font-size:16px; font-weight:600; color:#7dd3fc;'>\${$credits}</div></div>";
        $html .= "<div style='padding:10px 12px; border:1px solid #334155; border-radius:8px; background:#0b1020;'><div style='font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em;'>Lifetime debits</div><div style='font-size:16px; font-weight:600; color:#fca5a5;'>\${$debits}</div></div>";
        $html .= "<div style='padding:10px 12px; border:1px solid #334155; border-radius:8px; background:#0b1020;'><div style='font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em;'>Total transactions</div><div style='font-size:16px; font-weight:600; color:#fff;'>{$total}</div></div>";
        $html .= '</div>';

        return $html;
    }

    /** Team summary chips: direct + binary L/R subtree counts. */
    private static function buildTeamSummaryHtml(User $user): string
    {
        $direct = User::query()->where('sponsor_id', $user->id)->count();
        $leftCount = $user->left_child_id ? self::countSubtree((int) $user->left_child_id) : 0;
        $rightCount = $user->right_child_id ? self::countSubtree((int) $user->right_child_id) : 0;
        $totalBinary = $leftCount + $rightCount;

        $html = "<div style='display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:8px; line-height:1.4;'>";
        $html .= "<div style='padding:10px 12px; border:1px solid #334155; border-radius:8px; background:#0b1020;'><div style='font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em;'>Direct referrals</div><div style='font-size:18px; font-weight:600; color:#c4b5fd;'>{$direct}</div></div>";
        $html .= "<div style='padding:10px 12px; border:1px solid #334155; border-radius:8px; background:#0b1020;'><div style='font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em;'>Left team</div><div style='font-size:18px; font-weight:600; color:#7dd3fc;'>{$leftCount}</div></div>";
        $html .= "<div style='padding:10px 12px; border:1px solid #334155; border-radius:8px; background:#0b1020;'><div style='font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em;'>Right team</div><div style='font-size:18px; font-weight:600; color:#fbcfe8;'>{$rightCount}</div></div>";
        $html .= "<div style='padding:10px 12px; border:1px solid #334155; border-radius:8px; background:#0b1020;'><div style='font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em;'>Total binary</div><div style='font-size:18px; font-weight:600; color:#fff;'>{$totalBinary}</div></div>";
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
                TextEntry::make('wallet_summary_card')
                    ->label('Wallet summary')
                    ->state(fn (User $record): string => self::buildWalletSummaryHtml($record))
                    ->html()
                    ->columnSpanFull(),
                TextEntry::make('team_summary_card')
                    ->label('Team summary')
                    ->state(fn (User $record): string => self::buildTeamSummaryHtml($record))
                    ->html()
                    ->columnSpanFull(),
                TextEntry::make('direct_referrals_list')
                    ->label('Direct referrals')
                    ->state(fn (User $record): string => self::buildDirectReferralsHtml($record))
                    ->html()
                    ->columnSpanFull(),
                TextEntry::make('team_structure_tree')
                    ->label('Binary tree (up to 6 levels)')
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

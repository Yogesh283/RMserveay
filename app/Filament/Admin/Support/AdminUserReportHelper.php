<?php

namespace App\Filament\Admin\Support;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class AdminUserReportHelper
{
    public static function packageLabel(User $user): string
    {
        if ($user->user_type === 'publisher') {
            return 'Publisher';
        }

        if (! $user->qualifiesActivePanelistIncome()) {
            return $user->activation_fee_paid_at !== null ? 'Activation only' : 'Inactive';
        }

        if ((int) $user->super_sub_panel_count > 0) {
            return 'Super panelist';
        }

        if ((int) $user->sub_panel_count > 0) {
            return 'Sub panelist';
        }

        return 'Active panelist';
    }

    public static function activatedPanelsSummary(User $user): string
    {
        $parts = [];

        if ($user->activation_fee_paid_at !== null) {
            $parts[] = '$1 Activation';
        }
        if ($user->minimum_panel_fee_paid_at !== null) {
            $parts[] = '$10 Active panel';
        }
        $sub = (int) $user->sub_panel_count;
        if ($sub > 0) {
            $parts[] = "Sub panel ×{$sub}";
        }
        $super = (int) $user->super_sub_panel_count;
        if ($super > 0) {
            $parts[] = "Super panel ×{$super}";
        }

        return $parts === [] ? '—' : implode(' · ', $parts);
    }

    public static function uplineLabel(?User $sponsor): string
    {
        if ($sponsor === null) {
            return '—';
        }

        $uid = $sponsor->login_uid ? strtoupper((string) $sponsor->login_uid) : '#'.$sponsor->id;

        return trim($uid.' · '.($sponsor->name ?? ''));
    }

    public static function positionLabel(?string $binarySide): string
    {
        return match (strtolower((string) $binarySide)) {
            'left' => 'Left',
            'right' => 'Right',
            default => '—',
        };
    }

    public static function lastLoginAt(int $userId): ?Carbon
    {
        $ts = DB::table('sessions')
            ->where('user_id', $userId)
            ->max('last_activity');

        if ($ts === null) {
            return null;
        }

        return Carbon::createFromTimestamp((int) $ts);
    }
}

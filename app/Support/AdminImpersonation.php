<?php

namespace App\Support;

use App\Models\User;
use Filament\Facades\Filament;
use Illuminate\Support\Facades\Auth;

class AdminImpersonation
{
    public const SESSION_ADMIN_ID = 'impersonator_admin_id';

    public const SESSION_RETURN_URL = 'impersonator_return_url';

    public static function isActive(): bool
    {
        return session()->has(self::SESSION_ADMIN_ID);
    }

    public static function adminId(): ?int
    {
        $id = session(self::SESSION_ADMIN_ID);

        return is_numeric($id) ? (int) $id : null;
    }

    public static function assertAdminUser(?User $admin): void
    {
        if ($admin === null || ! $admin->canAccessPanel(Filament::getPanel('admin'))) {
            abort(403, 'Admin access required.');
        }
    }

    public static function loginRoleFor(User $target): string
    {
        return $target->user_type === 'publisher' ? 'publisher' : 'normal';
    }
}

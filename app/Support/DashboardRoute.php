<?php

namespace App\Support;

class DashboardRoute
{
    /** Client path after login/register — main app dashboard per role. */
    public static function forAppRole(string $userType): string
    {
        return $userType === 'publisher' ? '/publisher' : '/member';
    }
}

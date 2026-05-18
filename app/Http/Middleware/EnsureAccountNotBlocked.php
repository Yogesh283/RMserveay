<?php

namespace App\Http\Middleware;

use App\Support\AdminImpersonation;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountNotBlocked
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (AdminImpersonation::isActive()) {
            return $next($request);
        }

        if ($user !== null && $user->isAccountBlocked()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json([
                'message' => 'Your account has been blocked. Please contact support.',
                'account_blocked' => true,
            ], 403);
        }

        return $next($request);
    }
}

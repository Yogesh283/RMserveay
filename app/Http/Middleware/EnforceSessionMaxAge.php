<?php

namespace App\Http\Middleware;

use App\Support\SessionAuthStamp;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnforceSessionMaxAge
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! SessionAuthStamp::isExpired($request)) {
            return $next($request);
        }

        Auth::guard('web')->logout();
        SessionAuthStamp::clear($request);

        if ($request->hasSession()) {
            $request->session()->forget('app_login_user_type');
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Your session has expired after 24 hours. Please log in again.',
                'session_expired' => true,
            ], 401);
        }

        return redirect()->guest('/login?expired=1');
    }
}

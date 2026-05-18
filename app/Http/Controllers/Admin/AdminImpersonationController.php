<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AdminImpersonation;
use App\Support\DashboardRoute;
use App\Support\SessionAuthStamp;
use Filament\Facades\Filament;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AdminImpersonationController extends Controller
{
    public function start(Request $request, User $user): RedirectResponse
    {
        /** @var User|null $admin */
        $admin = Auth::guard('admin')->user();
        AdminImpersonation::assertAdminUser($admin);

        if ($user->canAccessPanel(Filament::getPanel('admin'))) {
            abort(403, 'Cannot log in as another admin account.');
        }

        $returnUrl = $request->headers->get('referer');
        if (! is_string($returnUrl) || $returnUrl === '' || ! str_contains($returnUrl, '/kxyz')) {
            $returnUrl = route('filament.admin.resources.users.view', ['record' => $user->getKey()]);
        }

        $request->session()->put(AdminImpersonation::SESSION_ADMIN_ID, (int) $admin->id);
        $request->session()->put(AdminImpersonation::SESSION_RETURN_URL, $returnUrl);

        $role = AdminImpersonation::loginRoleFor($user);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $request->session()->put(AdminImpersonation::SESSION_ADMIN_ID, (int) $admin->id);
        $request->session()->put(AdminImpersonation::SESSION_RETURN_URL, $returnUrl);
        $request->session()->put('app_login_user_type', $role);
        SessionAuthStamp::stamp($request);

        Log::info('admin.impersonate.start', [
            'admin_id' => $admin->id,
            'admin_login_uid' => $admin->login_uid,
            'target_user_id' => $user->id,
            'target_login_uid' => $user->login_uid,
        ]);

        return redirect(DashboardRoute::forAppRole($role));
    }

    public function leave(Request $request): RedirectResponse
    {
        $adminId = AdminImpersonation::adminId();
        if ($adminId === null) {
            return redirect('/login');
        }

        $returnUrl = (string) ($request->session()->get(AdminImpersonation::SESSION_RETURN_URL) ?? '/kxyz');

        Auth::guard('web')->logout();

        $request->session()->forget([
            AdminImpersonation::SESSION_ADMIN_ID,
            AdminImpersonation::SESSION_RETURN_URL,
            'app_login_user_type',
        ]);

        /** @var User|null $admin */
        $admin = User::query()->find($adminId);
        if ($admin !== null && $admin->canAccessPanel(Filament::getPanel('admin'))) {
            Auth::guard('admin')->login($admin);
        }

        Log::info('admin.impersonate.leave', ['admin_id' => $adminId]);

        return redirect($returnUrl);
    }
}

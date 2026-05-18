/**
 * Shown when an admin is viewing the member/publisher app as another user.
 */
export default function ImpersonationBanner({ user }) {
    if (!user?.admin_impersonation) {
        return null;
    }

    const exitUrl = user.admin_impersonation_exit_url || '/admin/impersonate/leave';
    const uid = user.login_uid ? String(user.login_uid).toUpperCase() : 'member';

    return (
        <div
            className="relative z-[60] border-b border-amber-400/40 bg-gradient-to-r from-amber-600/95 to-orange-600/95 px-3 py-2 text-center text-sm text-white shadow-lg"
            role="status"
        >
            <span className="font-medium">Admin view</span>
            <span className="mx-1 opacity-90">— logged in as</span>
            <span className="font-bold tabular-nums">{uid}</span>
            <a
                href={exitUrl}
                className="ml-3 inline-flex rounded-lg border border-white/40 bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white transition hover:bg-white/25"
            >
                Exit to admin panel
            </a>
        </div>
    );
}

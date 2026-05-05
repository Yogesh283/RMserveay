import { prepareSanctum } from './auth';

/**
 * Prefer server `redirect_to` from login/register response.
 *
 * @param {object|undefined} user
 * @param {string|undefined} redirectTo
 */
function resolveDashboardPath(user, redirectTo) {
    if (typeof redirectTo === 'string' && redirectTo.startsWith('/')) {
        return redirectTo;
    }
    return user?.user_type === 'publisher' ? '/publisher' : '/member';
}

/**
 * After login/register: member or publisher home (or server `redirect_to`).
 *
 * @param {import('react-router-dom').NavigateFunction} navigate
 * @param {{ from?: import('react-router-dom').Location, user?: object, redirectTo?: string }} [options]
 */
export async function redirectAfterAuth(navigate, options = {}) {
    const from = options.from;
    if (from && typeof from.pathname === 'string' && from.pathname.startsWith('/survey')) {
        navigate('/', { replace: true });
        return;
    }

    const path = resolveDashboardPath(options.user, options.redirectTo);
    if (options.user && typeof options.user === 'object') {
        navigate(path, { replace: true });
        return;
    }

    try {
        await prepareSanctum();
        const res = await window.axios.get('api/user', {
            validateStatus: (status) => status === 200 || status === 401,
        });
        if (res.status === 200 && res.data?.user) {
            navigate(resolveDashboardPath(res.data.user, res.data.redirect_to), { replace: true });
        } else {
            navigate('/member', { replace: true });
        }
    } catch {
        navigate('/member', { replace: true });
    }
}

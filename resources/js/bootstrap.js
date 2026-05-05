import axios from 'axios';

window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.headers.common['Accept'] = 'application/json';
window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;

/**
 * API base URL for axios (Sanctum cookies must be same-site or listed in CORS).
 *
 * - Prefer current page origin when the SPA is served from the same Laravel app (fixes live
 *   deployments where VITE_APP_URL was built as localhost → CORS on sanctum/csrf-cookie).
 * - Use VITE_APP_URL only when it matches this page or when intentionally pointing at another API host.
 */
function resolveAppBaseUrl() {
    const origin = window.location.origin;

    const viteRaw = typeof import.meta.env.VITE_APP_URL === 'string' ? import.meta.env.VITE_APP_URL.trim() : '';
    const viteUrl = viteRaw.replace(/\/$/, '');

    const fromBlade = document.getElementById('app')?.dataset?.appUrl?.replace(/\/$/, '') ?? '';

    const path = window.location.pathname;
    const publicIdx = path.indexOf('/public');
    const xamppPublicBase =
        publicIdx !== -1 ? origin + path.slice(0, publicIdx + '/public'.length) : '';

    function safeOrigin(url) {
        try {
            return new URL(url).origin;
        } catch {
            return null;
        }
    }

    /** Misconfigured build: VITE_APP_URL is localhost but user opened production domain — never use it. */
    if (viteUrl) {
        try {
            const vu = new URL(viteUrl);
            const localDev =
                vu.hostname === 'localhost' || vu.hostname === '127.0.0.1' || vu.hostname === '[::1]';
            const pageHost = new URL(origin).hostname;
            const pageIsLocal =
                pageHost === 'localhost' || pageHost === '127.0.0.1' || pageHost === '[::1]';
            if (localDev && !pageIsLocal) {
                return xamppPublicBase || origin;
            }
        } catch {
            /* fall through */
        }
    }

    if (viteUrl && safeOrigin(viteUrl) === origin) {
        return viteUrl;
    }

    try {
        if (fromBlade && safeOrigin(fromBlade) === origin) {
            return fromBlade;
        }
    } catch {
        /* ignore */
    }

    if (xamppPublicBase) {
        return xamppPublicBase;
    }

    // Do NOT derive base URL from pathname (e.g. `/member/...`) — that pointed API at `/member/api`
    // and broke sanctum/login on nested SPA routes.

    // localhost vs 127.0.0.1 are different origins for cookies. APP_URL / VITE_APP_URL often uses
    // one while the tab uses the other → axios targeted the wrong host → Sanctum session missing → 401 on api/user.
    if (viteUrl) {
        try {
            const vu = new URL(viteUrl);
            const oo = new URL(origin);
            const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
            if (loopback.has(vu.hostname) && loopback.has(oo.hostname) && vu.port === oo.port) {
                return origin;
            }
        } catch {
            /* fall through */
        }
        return viteUrl;
    }

    return origin;
}

window.axios.defaults.baseURL = resolveAppBaseUrl();

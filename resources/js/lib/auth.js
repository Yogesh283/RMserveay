/** Ensures session + CSRF cookies for Sanctum SPA auth before login/register API calls. Paths are relative to axios baseURL (see bootstrap.js). */
export async function prepareSanctum() {
    await window.axios.get('sanctum/csrf-cookie');
}

/**
 * Current SPA user from Sanctum, or null when unauthenticated.
 * Uses validateStatus so HTTP 401 does not reject (fewer noisy failures in DevTools for guests).
 */
export async function fetchSessionUser() {
    await prepareSanctum();
    const res = await window.axios.get('api/user', {
        validateStatus: (status) => status === 200 || status === 401,
    });
    if (res.status === 200 && res.data?.user) {
        return res.data.user;
    }
    return null;
}

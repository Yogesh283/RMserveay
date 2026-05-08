/**
 * User-visible hint when axios gets no HTTP response (offline, CORS block, wrong API URL, SSL).
 */
export function describeAxiosNetworkError(err) {
    const msg = err?.message ? String(err.message) : '';
    const code = err?.code ? String(err.code) : '';
    const tail = [msg, code].filter(Boolean).join(' · ');

    return [
        "Couldn't reach the server from your browser (no HTTP status).",
        tail ? ` (${tail})` : '',
        'Check your live config: in `.env`, `APP_URL` must exactly match the full URL you open in the browser (e.g. `https://your-domain.com`); make sure `CORS_ALLOWED_ORIGINS` and `SANCTUM_STATEFUL_DOMAINS` include the same domain. Then run `php artisan config:clear`.',
        'If you opened `/member` or `/publisher` directly, try logging in from the Home page or `/login` first (older builds can sometimes hit wrong API routes).',
    ].join('');
}

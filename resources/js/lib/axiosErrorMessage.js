/**
 * User-visible hint when axios gets no HTTP response (offline, CORS block, wrong API URL, SSL).
 */
export function describeAxiosNetworkError(err) {
    const msg = err?.message ? String(err.message) : '';
    const code = err?.code ? String(err.code) : '';
    const tail = [msg, code].filter(Boolean).join(' · ');

    return [
        'ब्राउज़र सर्वर से जवाब नहीं ले पाया (कोई HTTP स्टेटस नहीं)।',
        tail ? ` (${tail})` : '',
        ' लाइव सर्वर पर चेक करें: `.env` में `APP_URL` वही पूरा URL हो जिस से साइट खुलती है (`https://your-domain.com`); `CORS_ALLOWED_ORIGINS` और `SANCTUM_STATEFUL_DOMAINS` में वही डोमेन; फिर `php artisan config:clear`।',
        ' अगर पेज `/member` या `/publisher` से खुला है तो पहले होम या `/login` से लॉगिन करें (पुरानी बिल्ड में API गलत रास्ते पर जा सकती थी)।',
    ].join('');
}

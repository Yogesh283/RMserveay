/** True when the site runs inside the Capacitor member APK (not a normal browser tab). */
export function isMemberNativeApp() {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        return window.Capacitor?.isNativePlatform?.() === true;
    } catch {
        return false;
    }
}

/** Member APK download — set on `#app` in welcome.blade.php; shown on website only. */
export function getMemberApkDownload() {
    const el = document.getElementById('app');
    const fileOnServer = el?.dataset?.memberApkAvailable === '1';
    const url = el?.dataset?.memberApkUrl?.trim() || '/download/member-app';

    const available = fileOnServer && !isMemberNativeApp();

    return { available, url };
}

/** Short vibration on supported phones (secure context + user gesture). */
export function buzz(pattern = 15) {
    try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(pattern);
        }
    } catch {
        /* ignore */
    }
}

/** Success: quick double-tap feel */
export function buzzSuccess() {
    buzz([20, 40, 25]);
}

/** Error: single longer pulse */
export function buzzError() {
    buzz(60);
}

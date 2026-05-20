/**
 * Carry forward is shown only on the stronger (power) leg — never on both sides.
 */

const DASH = '—';

/** @returns {{ left: number|string, right: number|string }} */
export function powerLegCarryForwardDisplay(left, right, data) {
    const l = Number(left) | 0;
    const r = Number(right) | 0;

    if (l === 0 && r === 0) {
        return { left: 0, right: 0 };
    }

    const weakSide = data?.today_weak_side;

    if (weakSide === 'left') {
        return { left: DASH, right: r };
    }
    if (weakSide === 'right') {
        return { left: l, right: DASH };
    }
    if (l > r) {
        return { left: l, right: DASH };
    }
    if (r > l) {
        return { left: DASH, right: r };
    }

    return { left: l, right: DASH };
}

/** True when this column should show a carry-forward value (power leg only). */
export function isPowerLegCarryVisible(value) {
    return value !== DASH && value !== 0 && value !== '0' && value != null && value !== '';
}

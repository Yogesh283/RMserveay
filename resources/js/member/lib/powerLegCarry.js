/**
 * Carry forward = strong (power) leg par sirf difference.
 * Weak leg par — (kuch nahi).
 *
 * Team table uses lifetime leg totals (active panelists / sub panels / super panels).
 * Agar closing carry_out sirf ek side par ho to wahi use hota hai jab wo power leg se match kare.
 */

const DASH = '—';

/**
 * @param {number|string} legLeft  Lifetime count under left leg (team table)
 * @param {number|string} legRight Lifetime count under right leg
 * @param {number|string} [closingLeftOut]  Optional closing left_carry_out
 * @param {number|string} [closingRightOut] Optional closing right_carry_out
 * @returns {{ left: number|string, right: number|string }}
 */
export function teamCarryForwardFromLegTotals(legLeft, legRight, closingLeftOut, closingRightOut) {
    const l = Number(legLeft) | 0;
    const r = Number(legRight) | 0;

    if (l === 0 && r === 0) {
        return { left: 0, right: 0 };
    }

    const powerIsLeft = l > r;
    const powerIsRight = r > l;

    if (!powerIsLeft && !powerIsRight) {
        return { left: 0, right: 0 };
    }

    const diff = Math.abs(l - r);
    const clo = Number(closingLeftOut) | 0;
    const cro = Number(closingRightOut) | 0;

    let value = diff;
    if (powerIsLeft && clo > 0 && cro === 0) {
        value = clo;
    } else if (powerIsRight && cro > 0 && clo === 0) {
        value = cro;
    }

    if (powerIsLeft) {
        return { left: value, right: DASH };
    }

    return { left: DASH, right: value };
}

/** @deprecated Use teamCarryForwardFromLegTotals for team table rows */
export function powerLegCarryForwardDisplay(left, right, data) {
    const legL = data?.total_left_active_panels ?? data?.total_left_subs ?? data?.total_left_supers ?? left;
    const legR = data?.total_right_active_panels ?? data?.total_right_subs ?? data?.total_right_supers ?? right;

    return teamCarryForwardFromLegTotals(
        legL,
        legR,
        data?.today_left_carry_out ?? data?.display_carry_left,
        data?.today_right_carry_out ?? data?.display_carry_right,
    );
}

/**
 * Sub/super: inactive earners show live binary queue on both legs.
 * Eligible earners use power-leg diff from team leg totals (+ closing carry_out).
 *
 * @param {{
 *   eligible?: boolean,
 *   carryLeft?: number|string,
 *   carryRight?: number|string,
 *   legLeft?: number|string,
 *   legRight?: number|string,
 *   closingLeftOut?: number|string,
 *   closingRightOut?: number|string,
 * }} opts
 */
export function matchingCarryDisplay(opts = {}) {
    const eligible = opts.eligible === true;

    if (!eligible) {
        return {
            left: Number(opts.carryLeft) | 0,
            right: Number(opts.carryRight) | 0,
        };
    }

    return teamCarryForwardFromLegTotals(
        opts.legLeft,
        opts.legRight,
        opts.closingLeftOut,
        opts.closingRightOut,
    );
}

/** True when this column should show a carry-forward value (power leg only). */
export function isPowerLegCarryVisible(value) {
    return value !== DASH && value !== 0 && value !== '0' && value != null && value !== '';
}

/** Show carry chip when inactive (both sides) or power-leg carry > 0. */
export function isCarryChipVisible(value, { bilateral = false } = {}) {
    if (bilateral) {
        return value !== DASH && value != null && value !== '';
    }

    return isPowerLegCarryVisible(value);
}

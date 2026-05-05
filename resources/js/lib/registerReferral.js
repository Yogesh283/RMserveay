/**
 * Referral / binary invite query params (member team links, shared URLs).
 * @param {URLSearchParams} params
 * @returns {{ ref: string; side: 'left' | 'right' | '' }}
 */
export function readReferralParams(params) {
    const ref = (params.get('ref') ?? params.get('referral') ?? '').trim();
    const raw = params.get('side');
    const side = raw === 'left' || raw === 'right' ? raw : '';
    return { ref, side };
}

/**
 * Copy ref + side from `from` into `target` URLSearchParams when present.
 * @param {URLSearchParams} from
 * @param {URLSearchParams} target
 */
export function copyReferralParams(from, target) {
    const { ref, side } = readReferralParams(from);
    if (ref) {
        target.set('ref', ref);
    }
    if (side) {
        target.set('side', side);
    }
}

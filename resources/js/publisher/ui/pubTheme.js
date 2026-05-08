/**
 * RM Survey — Publisher panel design tokens (dark premium fintech).
 * Do not use light theme or per-page color overrides.
 */

export const pubColors = {
    bg: '#0B0F1A',
    card: '#111827',
    inner: '#1A2235',
    border: '#2A3550',
    text: '#FFFFFF',
    muted: '#9CA3AF',
    accentGlow: '#7C5CFF',
    gradFrom: '#6C4CF1',
    gradTo: '#8E6BFF',
};

/** Tailwind class bundles */
export const pub = {
    page: 'min-h-full text-white',
    bg: 'bg-[#0B0F1A]',
    surface: 'bg-[#111827]',
    inner: 'bg-[#1A2235]',
    border: 'border-[#2A3550]',
    text: 'text-white',
    muted: 'text-[#9CA3AF]',
    /** Cards: 12–16px radius per spec */
    card:
        'relative overflow-hidden rounded-2xl border border-[#2A3550] bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(13,19,33,0.96))] shadow-[0_10px_34px_rgba(0,0,0,0.38)] backdrop-blur-sm transition-all duration-200 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent',
    cardHover: 'hover:border-[#7C5CFF]/40 hover:shadow-[0_0_28px_rgba(124,92,255,0.16)]',
    innerCard: 'rounded-xl border border-[#2A3550] bg-[#1A2235]',
    input:
        'w-full rounded-xl border border-[#2A3550] bg-[#1A2235]/95 px-4 py-2.5 text-sm text-white placeholder:text-[#9CA3AF]/55 outline-none transition duration-200 focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/25',
    select: 'appearance-none rounded-xl border border-[#2A3550] bg-[#1A2235]/95 px-4 py-2.5 text-sm text-white outline-none transition duration-200 focus:border-[#7C5CFF] focus:ring-2 focus:ring-[#7C5CFF]/25',
    label: 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]',
    btnPrimary:
        'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6C4CF1] to-[#8E6BFF] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(124,92,255,0.35)] transition duration-200 hover:brightness-110 hover:shadow-[0_0_32px_rgba(124,92,255,0.45)] active:scale-[0.98] disabled:opacity-50',
    btnSecondary:
        'inline-flex items-center justify-center gap-2 rounded-xl border border-[#2A3550] bg-[#111827] px-5 py-2.5 text-sm font-semibold text-white transition duration-200 hover:border-[#7C5CFF]/45 hover:bg-[#1A2235] hover:shadow-[0_0_20px_rgba(124,92,255,0.12)] active:scale-[0.98]',
    link: 'text-[#8E6BFF] transition hover:text-[#B4A0FF] hover:underline',
    tableWrap:
        'overflow-hidden rounded-2xl border border-[#2A3550] bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(13,19,33,0.96))] shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
    tableHead: 'bg-[#1A2235] text-left text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]',
    tableRow: 'border-t border-[#2A3550] bg-[#111827] transition duration-150 hover:bg-[#1A2235]/80',
    tableCell: 'px-4 py-3.5 text-sm',
    gradientActive: 'bg-gradient-to-r from-[#6C4CF1] to-[#8E6BFF] text-white shadow-[0_0_24px_rgba(124,92,255,0.35)]',
    navIdle:
        'text-[#9CA3AF] transition duration-200 hover:bg-white/[0.04] hover:text-white hover:shadow-[inset_0_0_20px_rgba(124,92,255,0.08)]',
    glassHeader: 'border-b border-[#2A3550] bg-[#111827]/90 backdrop-blur-xl',
    glowDivider: 'h-px bg-gradient-to-r from-transparent via-[#7C5CFF]/40 to-transparent',
};

export const colors = {
    bg: '#0B2C4D',
    bgDeep: '#071e36',
    surface: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.08)',
    text: '#f1f5f9',
    muted: '#94a3b8',
    goldLight: '#F4D03F',
    goldMid: '#D4AF37',
    goldDark: '#B8860B',
    violetGlow: 'rgba(139, 92, 246, 0.22)',
    success: '#34d399',
    danger: '#fb7185',
} as const;

export const space = (n: number) => n * 8;

export const radii = {
    md: 16,
    lg: 20,
    xl: 24,
} as const;

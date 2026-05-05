/** Decorative SVGs — cart + coins (survey rewards), gift (referrals) */

export function CartCoinsIllustration({ className = 'h-36 w-36' }) {
    return (
        <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <defs>
                <linearGradient id="cc-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FCD34D" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
                <linearGradient id="cc-purple" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
                <filter id="cc-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="b" />
                    <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <ellipse cx="100" cy="168" rx="72" ry="14" fill="rgba(124,58,237,0.15)" />
            <rect x="48" y="88" width="104" height="72" rx="14" fill="url(#cc-purple)" opacity="0.35" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            <rect x="56" y="96" width="88" height="48" rx="8" fill="rgba(15,23,42,0.85)" />
            <circle cx="78" cy="118" r="6" fill="#F59E0B" filter="url(#cc-glow)" />
            <circle cx="100" cy="118" r="6" fill="url(#cc-gold)" filter="url(#cc-glow)" />
            <circle cx="122" cy="118" r="6" fill="#3B82F6" opacity="0.9" />
            <path d="M52 88 L100 52 L148 88" stroke="url(#cc-purple)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
            <circle cx="140" cy="64" r="22" fill="url(#cc-gold)" stroke="rgba(255,255,255,0.25)" strokeWidth="2" filter="url(#cc-glow)" />
            <text x="140" y="70" textAnchor="middle" fill="#0F172A" fontSize="18" fontWeight="bold" fontFamily="system-ui">
                ₹
            </text>
            <circle cx="58" cy="56" r="16" fill="url(#cc-gold)" opacity="0.95" filter="url(#cc-glow)" />
        </svg>
    );
}

export function GiftBoxIllustration({ className = 'h-32 w-32' }) {
    return (
        <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <defs>
                <linearGradient id="gf-bow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
                <linearGradient id="gf-box" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1E293B" />
                    <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>
            </defs>
            <ellipse cx="100" cy="172" rx="60" ry="12" fill="rgba(245,158,11,0.12)" />
            <rect x="52" y="88" width="96" height="72" rx="12" fill="url(#gf-box)" stroke="rgba(124,58,237,0.4)" strokeWidth="1.5" />
            <rect x="52" y="88" width="96" height="20" rx="12" fill="rgba(59,130,246,0.25)" />
            <path d="M100 88 V160" stroke="url(#gf-bow)" strokeWidth="8" strokeLinecap="round" />
            <path d="M100 72 C88 56 72 52 72 68 C72 84 88 88 100 88 C112 88 128 84 128 68 C128 52 112 56 100 72Z" fill="url(#gf-bow)" opacity="0.95" />
        </svg>
    );
}

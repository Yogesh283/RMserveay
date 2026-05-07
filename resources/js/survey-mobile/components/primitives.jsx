import { Link } from 'react-router-dom';

/**
 * RM Survey — unified dark fintech (Web + Mobile)
 * Background canvas #0B0F1A · Cards #111827 · Accent #6C4CF1 → #8E6BFF · Text #FFFFFF / #A0AEC0
 */

const cardBase =
    'rounded-[16px] border backdrop-blur-xl transition-all duration-300 sm:rounded-[18px]';

export function Card({ children, variant = 'default', className = '', padding = true }) {
    const variants = {
        default:
            'border-white/[0.08] bg-[#111827]/90 shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]',
        elevated:
            'border-white/10 bg-[#111827] shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(108,76,241,0.12)] hover:border-[rgba(142,107,255,0.35)]',
        gold:
            'border-[rgba(245,158,11,0.35)] bg-gradient-to-br from-[rgba(245,158,11,0.12)] via-[rgba(124,58,237,0.08)] to-[rgba(15,23,42,0.9)] shadow-[0_0_40px_rgba(245,158,11,0.15),0_8px_32px_rgba(0,0,0,0.4)]',
        inset: 'border-white/[0.06] bg-[rgba(11,15,26,0.75)] shadow-inner',
        neon: 'border-[rgba(59,130,246,0.25)] bg-gradient-to-br from-[rgba(124,58,237,0.12)] to-[rgba(59,130,246,0.06)] shadow-[0_0_32px_rgba(124,58,237,0.2)]',
    };
    return (
        <div className={[cardBase, variants[variant] ?? variants.default, padding ? 'p-3 sm:p-4' : '', className].join(' ')}>
            {children}
        </div>
    );
}

const btnBase =
    'inline-flex items-center justify-center rounded-[18px] font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none';

const btnSizes = {
    sm: 'px-3.5 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
};

const btnVariants = {
    gold: 'bg-gradient-to-r from-amber-400 via-[#F59E0B] to-amber-600 text-[#0B0F1A] shadow-[0_4px_24px_rgba(245,158,11,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_8px_32px_rgba(245,158,11,0.5)]',
    goldOutline:
        'border border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/18 hover:border-amber-400/60',
    neon: 'bg-gradient-to-r from-[#6C4CF1] to-[#8E6BFF] text-white shadow-[0_4px_28px_rgba(108,76,241,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] hover:shadow-[0_8px_36px_rgba(142,107,255,0.4)]',
    purple:
        'border border-violet-500/35 bg-violet-600/15 text-violet-100 shadow-[0_0_24px_rgba(124,58,237,0.2)] hover:bg-violet-600/25',
    ghost: 'border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]',
    success:
        'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-[0_4px_28px_rgba(16,185,129,0.45),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_8px_32px_rgba(52,211,153,0.35)]',
    danger: 'border border-rose-500/35 bg-rose-600/15 text-rose-100 hover:bg-rose-600/25',
};

export function Button({ children, variant = 'neon', size = 'md', className = '', type = 'button', ...props }) {
    const v = btnVariants[variant] ?? btnVariants.neon;
    return (
        <button type={type} className={[btnBase, btnSizes[size], v, className].join(' ')} {...props}>
            {children}
        </button>
    );
}

const linkVariants = {
    gold: btnVariants.gold,
    goldOutline: btnVariants.goldOutline,
    neon: btnVariants.neon,
    purple: btnVariants.purple,
    ghost: btnVariants.ghost,
    success: btnVariants.success,
};

export function ButtonLink({ to, children, variant = 'neon', size = 'md', className = '', ...props }) {
    const v = linkVariants[variant] ?? linkVariants.neon;
    return (
        <Link to={to} className={[btnBase, 'w-full', btnSizes[size], v, className].join(' ')} {...props}>
            {children}
        </Link>
    );
}

export function Input({ className = '', ...props }) {
    return (
        <input
            className={[
                'w-full rounded-[18px] border border-white/[0.1] bg-[#111827] px-4 py-3.5 text-sm text-white placeholder:text-[#A0AEC0]',
                'sm:rounded-[16px] sm:px-3.5 sm:py-2.5',
                'focus:border-[#8E6BFF]/55 focus:outline-none focus:ring-2 focus:ring-[#6C4CF1]/35',
                className,
            ].join(' ')}
            {...props}
        />
    );
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
    return (
        <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
            </span>
            <input
                type="search"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full rounded-[16px] border border-white/[0.1] bg-[#111827] py-2.5 pl-11 pr-3.5 text-sm text-white placeholder:text-[#A0AEC0] focus:border-[#8E6BFF]/50 focus:outline-none focus:ring-2 focus:ring-[#6C4CF1]/25"
            />
        </div>
    );
}

export function ScreenTitle({ eyebrow, title, subtitle }) {
    return (
        <header className="mb-4">
            {eyebrow ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-transparent bg-gradient-to-r from-[#8E6BFF] to-[#6C4CF1] bg-clip-text">
                    {eyebrow}
                </p>
            ) : null}
            <h1 className="mt-1 text-[22px] font-bold tracking-tight text-white">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm leading-snug text-[#A0AEC0]">{subtitle}</p> : null}
        </header>
    );
}

export function GlassCard({ children, glow, className = '' }) {
    return (
        <div
            className={[
                cardBase,
                'border-white/[0.08] bg-[rgba(15,23,42,0.5)] p-3 backdrop-blur-xl sm:p-4',
                glow
                    ? 'shadow-[0_0_48px_rgba(124,58,237,0.2)] ring-1 ring-[rgba(59,130,246,0.25)]'
                    : 'shadow-[0_8px_32px_rgba(0,0,0,0.35)]',
                className,
            ].join(' ')}
        >
            {children}
        </div>
    );
}

export function GradientButton({ children, className = '', variant = 'primary', ...props }) {
    const map = {
        ghost: 'ghost',
        purple: 'purple',
        neon: 'neon',
        green: 'success',
        success: 'success',
        primary: 'neon',
    };
    const v = map[variant] ?? 'neon';
    return (
        <Button variant={v} className={['w-full', className].join(' ')} {...props}>
            {children}
        </Button>
    );
}

export function GradientButtonLink({ variant = 'primary', className = '', ...props }) {
    const map = {
        ghost: 'ghost',
        purple: 'purple',
        neon: 'neon',
        green: 'success',
        success: 'success',
        primary: 'neon',
    };
    const v = map[variant] ?? 'neon';
    return <ButtonLink variant={v} className={className} {...props} />;
}

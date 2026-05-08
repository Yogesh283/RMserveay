import { pub } from '../ui/pubTheme';

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {import('react').ReactNode} [props.actions]
 */
export default function PubPageHeader({ title, subtitle, actions }) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-[#7C5CFF]/30 bg-[linear-gradient(135deg,rgba(108,76,241,0.14),rgba(17,24,39,0.95)_45%,rgba(17,24,39,0.98))] p-4 shadow-[0_12px_34px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-5">
            <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#8E6BFF]/25 blur-2xl" />
            <div className="pointer-events-none absolute left-0 top-0 h-12 w-12 rounded-full bg-cyan-400/10 blur-xl" />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className={`bg-gradient-to-r from-white via-violet-100 to-[#C4B5FD] bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl`}>
                        {title}
                    </h1>
                    {subtitle ? <p className={`mt-1 max-w-2xl text-sm leading-relaxed ${pub.muted}`}>{subtitle}</p> : null}
                </div>
                {actions ? <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5">{actions}</div> : null}
            </div>
        </div>
    );
}

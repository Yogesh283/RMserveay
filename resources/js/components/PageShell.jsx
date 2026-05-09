import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppLogo from './AppLogo';
import { APP_NAME_FALLBACK } from '../lib/branding';

const display = "font-['Plus_Jakarta_Sans',Inter,system-ui,sans-serif]";

/**
 * Shared inner wrapper so every route uses the same content width, spacing, and card style
 * as the main marketing shell (Layout / Home).
 * `compact` — tighter padding, single-screen login-style layout (centered in viewport).
 */
export default function PageShell({ title, eyebrow, children, hideLogo, compact }) {
    const appName = useMemo(() => document.getElementById('app')?.dataset?.appName ?? APP_NAME_FALLBACK, []);

    const outer = compact
        ? 'mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-3 pb-4 pt-2 sm:max-w-lg sm:px-6 sm:py-8 sm:pb-8'
        : 'mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-20';

    const card = compact
        ? `rounded-2xl border border-white/[0.1] bg-[rgba(15,23,42,0.5)] p-4 shadow-[0_8px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:rounded-3xl sm:p-7`
        : `rounded-3xl border border-white/[0.1] bg-[rgba(15,23,42,0.42)] p-8 shadow-[0_16px_56px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10 md:p-12 lg:p-14`;

    const logoWrap = compact ? '-mt-0 mb-2 flex flex-col items-center gap-0.5 sm:mb-4 sm:gap-1' : '-mt-1 mb-8 flex flex-col items-center gap-2 sm:mb-10';
    const logoSize = compact ? 'h-20 w-20 sm:h-24 sm:w-24' : 'h-28 w-28 sm:h-36 sm:w-36';
    const nameCls = compact
        ? 'text-center text-xs font-semibold tracking-wide text-[#cbd5e1] sm:text-sm'
        : 'text-center text-sm font-semibold tracking-tight text-[#cbd5e1] sm:text-base';

    const eyebrowCls = compact
        ? 'text-[10px] font-semibold uppercase tracking-[0.22em] text-[#93C5FD] sm:text-[11px]'
        : 'text-xs font-semibold uppercase tracking-[0.24em] text-[#93C5FD] sm:text-sm';

    const titleCls = `${display} ${
        compact
            ? 'mt-1 text-2xl font-bold leading-tight tracking-tight text-white sm:mt-2 sm:text-3xl'
            : 'mt-3 text-[clamp(1.75rem,4.5vw,2.75rem)] font-extrabold leading-[1.15] tracking-tight text-white'
    }`;

    const bodyCls = compact
        ? 'mt-3 space-y-3 text-[15px] leading-relaxed text-[#cbd5e1] sm:mt-5 sm:space-y-4 sm:text-base [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:text-[#93C5FD] [&_a]:text-[#93C5FD] [&_a]:underline [&_a]:underline-offset-2 [&_a]:transition-colors [&_a:hover]:text-white'
        : `mt-8 space-y-5 text-[17px] leading-relaxed text-[#cbd5e1] sm:text-lg [&_code]:rounded-md [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[15px] [&_code]:text-[#93C5FD] [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-white sm:[&_h2]:text-2xl [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2.5 [&_ul]:pl-6 [&_a]:font-medium [&_a]:text-[#93C5FD] [&_a]:underline [&_a]:underline-offset-4 [&_a]:transition-colors [&_a:hover]:text-white`;

    return (
        <div className={compact ? 'flex min-h-[calc(100dvh-3.25rem)] flex-col sm:min-h-[calc(100dvh-3.75rem)]' : ''}>
            <div className={outer}>
                <div className={card}>
                    {!hideLogo ? (
                        <div className={logoWrap}>
                            <Link
                                to="/"
                                aria-label={`${appName} — home`}
                                className="inline-flex flex-col items-center gap-1 rounded-xl ring-offset-2 ring-offset-[#0B0F1A] transition-all duration-300 ease-out hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/50 sm:gap-2"
                            >
                                <AppLogo alt="" className={logoSize} />
                                <span className={nameCls}>{appName}</span>
                            </Link>
                        </div>
                    ) : null}
                    {eyebrow ? <p className={eyebrowCls}>{eyebrow}</p> : null}
                    <h1 className={titleCls}>{title}</h1>
                    <div className={bodyCls}>{children}</div>
                </div>
            </div>
        </div>
    );
}

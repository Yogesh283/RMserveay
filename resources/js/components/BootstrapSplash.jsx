import { useEffect, useRef, useState } from 'react';
import AppLogo from './AppLogo';
import { APP_NAME_FALLBACK } from '../lib/branding';

const DISPLAY = "font-['Plus_Jakarta_Sans',Inter,system-ui,sans-serif]";

/**
 * First session load: full-screen brand splash with a ~2s loading line, then onComplete.
 * Respects prefers-reduced-motion (instant complete).
 */
export default function BootstrapSplash({ onComplete }) {
    const reducedMotion = useRef(
        typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    );
    const [progress, setProgress] = useState(0);

    const appName = document.getElementById('app')?.dataset?.appName ?? APP_NAME_FALLBACK;

    useEffect(() => {
        if (reducedMotion.current) {
            onComplete();
            return undefined;
        }
        const id = requestAnimationFrame(() => setProgress(100));
        const finish = window.setTimeout(() => onComplete(), 2000);
        return () => {
            cancelAnimationFrame(id);
            window.clearTimeout(finish);
        };
    }, [onComplete]);

    return (
        <div
            className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#0B0F1A] ${DISPLAY}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label={appName}
        >
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_55%_at_50%_-10%,rgba(124,58,237,0.22),transparent_50%)]"
                aria-hidden
            />
            <div className="relative flex flex-col items-center px-6">
                <AppLogo alt="" className="h-40 w-40 sm:h-48 sm:w-48" aria-hidden />
                <p className="mt-6 text-center text-lg font-semibold tracking-tight text-white sm:text-xl">{appName}</p>
                <p className="mt-2 text-center text-xs font-medium uppercase tracking-[0.28em] text-[#94a3b8]">Loading</p>
                <div className="mt-10 h-1.5 w-[min(280px,85vw)] overflow-hidden rounded-full bg-white/[0.12]">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] via-[#3B82F6] to-[#F59E0B] shadow-[0_0_24px_rgba(124,58,237,0.45)] transition-[width] duration-[2000ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

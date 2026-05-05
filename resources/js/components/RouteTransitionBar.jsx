import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Subtle top progress indicator when the SPA route changes (after bootstrap splash has finished).
 */
export default function RouteTransitionBar({ enabled }) {
    const location = useLocation();
    const [active, setActive] = useState(false);
    const firstRouteRef = useRef(true);

    useEffect(() => {
        if (!enabled) return;
        if (firstRouteRef.current) {
            firstRouteRef.current = false;
            return;
        }
        setActive(true);
        const t = window.setTimeout(() => setActive(false), 520);
        return () => window.clearTimeout(t);
    }, [location.pathname, location.search, location.hash, location.key, enabled]);

    if (!enabled) return null;

    return (
        <div
            className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden"
            aria-hidden
        >
            <div
                className={`h-full origin-left bg-gradient-to-r from-[#7C3AED] via-[#3B82F6] to-[#F59E0B] shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-[transform,opacity] duration-300 ease-out ${
                    active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                }`}
                style={{ transitionDuration: active ? '280ms' : '420ms' }}
            />
        </div>
    );
}

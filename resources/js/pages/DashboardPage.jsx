import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AppLogo from '../components/AppLogo';
import RmSurveyBackdrop from '../components/RmSurveyBackdrop';
import { fetchSessionUser } from '../lib/auth';
import { RM } from '../survey-mobile/theme';

const btnPrimary =
    'inline-flex items-center justify-center rounded-[20px] bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] px-8 py-3.5 text-sm font-semibold text-white ring-1 ring-[#F59E0B]/20 transition hover:brightness-110 active:brightness-95';
const btnGhost =
    'inline-flex items-center justify-center rounded-[20px] border border-white/[0.12] bg-white/[0.06] px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/[0.1] ring-1 ring-white/[0.06]';
const glowPurple = 'shadow-[0_0_28px_rgba(124,58,237,0.35)]';

/**
 * Legacy route: publishers → /publisher, members → /member. Guests see sign-in.
 */
export default function DashboardPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const nextUser = await fetchSessionUser();
                if (!cancelled) {
                    setUser(nextUser);
                }
            } catch {
                if (!cancelled) {
                    setUser(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const isPublisher = user?.user_type === 'publisher';

    if (!loading && user && isPublisher) {
        return <Navigate to="/publisher" replace />;
    }

    if (!loading && user && !isPublisher) {
        return <Navigate to="/member" replace />;
    }

    if (loading) {
        return (
            <div
                className="relative min-h-screen overflow-hidden font-[Inter,system-ui,sans-serif] text-slate-100 antialiased"
                style={{ backgroundColor: RM.bgDeep }}
            >
                <RmSurveyBackdrop />
                <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
                    <p className="text-slate-400">Loading workspace…</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="relative min-h-screen overflow-hidden font-[Inter,system-ui,sans-serif] text-slate-100 antialiased"
            style={{ backgroundColor: RM.bgDeep }}
        >
            <RmSurveyBackdrop />
            <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
                <Link to="/" className="mb-8 outline-none transition hover:opacity-90">
                    <AppLogo alt="Home" className="h-28 w-28" />
                </Link>
                <p className="text-lg text-slate-300">Sign in to open your dashboard.</p>
                <Link to="/login" className={`mt-6 ${btnPrimary} ${glowPurple}`}>
                    Log in
                </Link>
                <Link to="/register/panelist" className={`mt-3 ${btnGhost}`}>
                    Register
                </Link>
            </div>
        </div>
    );
}

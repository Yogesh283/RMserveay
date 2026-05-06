import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppLogo from './AppLogo';
import HomeLanguageSwitcher from './HomeLanguageSwitcher';
import { APP_NAME_FALLBACK } from '../lib/branding';
import { fetchSessionUser, prepareSanctum } from '../lib/auth';
import { copyReferralParams } from '../lib/registerReferral';

function linkClass(isActive, dense) {
    return [
        dense
            ? 'rounded-[10px] px-2.5 py-1.5 text-sm font-medium'
            : 'rounded-[12px] px-3 py-2 text-base font-medium',
        'transition-all duration-300 ease-out',
        isActive
            ? 'bg-[rgba(124,58,237,0.22)] text-white shadow-[0_0_20px_rgba(124,58,237,0.25)] ring-1 ring-[#F59E0B]/25'
            : 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
    ].join(' ');
}

/** Mobile drawer — compressed rows (~40px), readable type */
function mobileNavLinkClass(isActive) {
    return [
        'group flex min-h-[48px] items-center rounded-2xl px-3 py-2 text-[13px] font-medium leading-snug tracking-tight transition duration-200 ease-out active:scale-[0.99]',
        isActive
            ? 'bg-gradient-to-r from-[#7C3AED]/35 to-[#2563EB]/22 text-white shadow-[0_8px_24px_rgba(124,58,237,0.35)] ring-1 ring-[#8B5CF6]/55'
            : 'text-slate-200 hover:bg-white/[0.06] hover:text-white',
    ].join(' ');
}

const mobileDrawerBtnLogin =
    'flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 active:brightness-95';

const mobileDrawerBtnSignup =
    'flex min-h-[40px] flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] px-3 py-2 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(124,58,237,0.28)] ring-1 ring-amber-400/18 transition hover:brightness-110 active:brightness-95';

const mobileDrawerBtnLogout =
    'flex min-h-[40px] w-full items-center justify-center rounded-lg border border-red-500/30 bg-red-950/25 px-3 py-2 text-sm font-semibold text-red-100 backdrop-blur-sm transition hover:bg-red-950/40 active:brightness-95';

const drawerToggleTrackBase =
    'h-6 w-11 rounded-full border transition-all duration-200';
const drawerToggleThumbBase =
    'h-[18px] w-[18px] rounded-full bg-white shadow-[0_4px_10px_rgba(0,0,0,0.35)] transition-transform duration-200';

function DrawerRowIcon({ children }) {
    return (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-white/90">
            {children}
        </span>
    );
}

function ArrowRightIcon() {
    return (
        <svg className="h-4 w-4 text-slate-400 transition group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    );
}

const btnSignup =
    'rounded-[12px] bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] px-4 py-2.5 text-base font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] ring-1 ring-amber-400/20 transition-all duration-300 ease-out hover:brightness-110';

const btnLogin =
    'rounded-[12px] border border-white/[0.12] bg-white/[0.06] px-4 py-2.5 text-base font-medium text-white backdrop-blur-sm transition-all duration-300 ease-out hover:bg-white/10';

const btnLogout =
    'rounded-[12px] border border-red-500/30 bg-red-950/25 px-4 py-2.5 text-base font-medium text-red-100 backdrop-blur-sm transition hover:bg-red-950/40';

export default function Layout() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    /** Member signup — keeps `ref` / `side` from the current home URL when inviting from the same tab. */
    const registerMemberTo = useMemo(() => {
        const cur = location.pathname === '/' ? new URLSearchParams(location.search) : new URLSearchParams();
        const next = new URLSearchParams();
        copyReferralParams(cur, next);
        next.set('account', 'normal');
        next.set('flow', 'register');
        const qs = next.toString();
        return { pathname: '/', search: qs ? `?${qs}` : '', hash: 'register' };
    }, [location.pathname, location.search]);

    const appName = useMemo(() => {
        const root = document.getElementById('app');
        return root?.dataset?.appName ?? APP_NAME_FALLBACK;
    }, []);

    const [menuOpen, setMenuOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [drawerLoginAsPublisher, setDrawerLoginAsPublisher] = useState(false);
    const [drawerRememberMe, setDrawerRememberMe] = useState(true);

    const siteNavItems = useMemo(() => {
        const items = [
            { to: '/', label: t('layout.nav.home'), end: true },
            { to: '/about', label: t('layout.nav.about') },
            { to: '/why-join-us', label: t('layout.nav.whyJoin') },
            { to: '/faqs', label: t('layout.nav.faqs') },
            { to: '/contact', label: t('layout.nav.contact') },
            { to: '/dashboard', label: t('layout.nav.dashboard') },
        ];
        if (user?.user_type === 'publisher') {
            items.push({ to: '/publisher', label: t('layout.nav.publisher') });
        } else if (user && user.user_type !== 'publisher') {
            items.push({ to: '/member', label: t('layout.nav.incomePanel') });
        }
        return items;
    }, [user?.user_type, user, t, i18n.resolvedLanguage]);

    useEffect(() => {
        let cancelled = false;
        /** Guest-only routes: skip session fetch on login page. */
        if (location.pathname === '/login') {
            setUser(null);
            setAuthChecked(true);
            return undefined;
        }
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
                    setAuthChecked(true);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [location.pathname]);

    useEffect(() => {
        if (!menuOpen) {
            return undefined;
        }
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [menuOpen]);

    async function logout() {
        try {
            await prepareSanctum();
            await window.axios.post('api/logout');
        } catch {
            /* session may already be gone */
        }
        setUser(null);
        setMenuOpen(false);
        navigate('/');
    }

    return (
        <div className="relative flex min-h-dvh w-full max-w-[100vw] flex-col overflow-x-hidden bg-[#0B0F1A] font-[Inter,system-ui,sans-serif] text-white antialiased">
            {/* Page backdrop — matches HomePage / survey-mobile */}
            <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-[#0B0F1A] via-[#0F172A] to-[#0B0F1A]" aria-hidden />
            <div
                className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_100%_65%_at_50%_-8%,rgba(124,58,237,0.14),transparent_55%)]"
                aria-hidden
            />
            <div
                className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_90%_30%,rgba(59,130,246,0.08),transparent_45%)]"
                aria-hidden
            />

            <header className="z-50 border-b border-white/[0.08] bg-[rgba(11,15,26,0.85)] shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:pt-[env(safe-area-inset-top,0px)] lg:sticky lg:top-0 lg:bg-[rgba(11,15,26,0.72)] lg:pt-0">
                <div className="relative z-[52] mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
                    <NavLink
                        to="/"
                        className="flex min-w-0 max-w-[58%] shrink-0 items-center gap-2.5 outline-none ring-offset-2 ring-offset-[#0B0F1A] transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#7C3AED]/50 sm:max-w-none"
                    >
                        <AppLogo alt="" className="h-14 w-14 sm:h-16 sm:w-16" aria-hidden />
                        <span className="truncate bg-gradient-to-r from-white via-slate-100 to-[#93C5FD] bg-clip-text text-sm font-semibold tracking-tight text-transparent sm:text-lg">
                            {appName}
                        </span>
                    </NavLink>

                    {/* Center: primary links + language row (matches marketing header reference) */}
                    <div className="hidden min-w-0 flex-1 flex-col items-center gap-1 lg:flex">
                        <nav className="flex w-full max-w-full flex-wrap items-center justify-center gap-x-0.5 gap-y-0.5 xl:flex-nowrap xl:gap-1" aria-label="Main">
                            {siteNavItems.map(({ to, label, end }) => (
                                <NavLink key={to} to={to} end={end} className={({ isActive }) => linkClass(isActive, true)}>
                                    {label}
                                </NavLink>
                            ))}
                        </nav>
                        <div className="flex w-full justify-center pt-0.5">
                            <HomeLanguageSwitcher variant="compact" />
                        </div>
                    </div>

                    <div className="ml-auto flex shrink-0 items-center gap-2">
                        <div className="hidden min-h-[40px] items-center gap-2 sm:flex">
                            {authChecked && user ? (
                                <button type="button" onClick={logout} className={btnLogout}>
                                    {t('layout.logout')}
                                </button>
                            ) : authChecked ? (
                                <>
                                    <NavLink to="/login" className={({ isActive }) => `${btnLogin} ${isActive ? 'bg-white/10 ring-1 ring-white/15' : ''}`}>
                                        {t('layout.login')}
                                    </NavLink>
                                    <NavLink to={registerMemberTo} className={btnSignup}>
                                        {t('layout.register')}
                                    </NavLink>
                                </>
                            ) : (
                                <span className="h-9 w-24 animate-pulse rounded-[12px] bg-white/5" aria-hidden />
                            )}
                        </div>

                        <button
                            type="button"
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.14] bg-gradient-to-br from-white/[0.09] to-white/[0.03] text-white shadow-[0_4px_24px_rgba(124,58,237,0.15)] ring-1 ring-white/[0.06] backdrop-blur-sm transition hover:border-[#7C3AED]/35 hover:from-[rgba(124,58,237,0.15)] active:scale-[0.96] lg:hidden"
                            aria-expanded={menuOpen}
                            aria-label={menuOpen ? t('common.closeMenu') : t('common.openMenu')}
                            onClick={() => setMenuOpen((o) => !o)}
                        >
                            <span className="sr-only">{t('common.menu')}</span>
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {menuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {menuOpen ? (
                    <>
                        <button
                            type="button"
                            className="fixed inset-0 z-[49] bg-[#0B0F1A]/75 backdrop-blur-md transition-opacity lg:hidden"
                            aria-label={t('common.closeMenu')}
                            onClick={() => setMenuOpen(false)}
                        />
                        <div className="relative z-[51] mx-auto max-h-[min(84vh,calc(100dvh-4.25rem))] overflow-y-auto overscroll-contain rounded-b-[28px] border-x border-b border-white/[0.1] border-t border-white/[0.06] bg-gradient-to-b from-[#050816]/[0.97] via-[#0A1020]/[0.98] to-[#0B1120]/[0.98] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_30px_70px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl lg:hidden">
                            <div className="mx-auto mb-3 h-1 w-12 shrink-0 rounded-full bg-white/18" aria-hidden />

                            <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <AppLogo alt="" className="h-11 w-11 shrink-0 rounded-2xl" aria-hidden />
                                        <div className="min-w-0">
                                            <p className="truncate bg-gradient-to-r from-white to-[#93C5FD] bg-clip-text text-[16px] font-semibold tracking-tight text-transparent">
                                                {appName}
                                            </p>
                                            <p className="mt-0.5 truncate text-[10px] tracking-wide text-slate-400">
                                                Insight • Innovation • Impact
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#8B5CF6]/60 bg-[#8B5CF6]/10 text-[#C4B5FD] shadow-[0_0_18px_rgba(139,92,246,0.4)]"
                                        aria-label={t('common.closeMenu')}
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4 rounded-[24px] border border-[#8B5CF6]/30 bg-gradient-to-r from-[#6D28D9]/40 via-[#7C3AED]/30 to-[#2563EB]/25 p-3 shadow-[0_16px_40px_rgba(76,29,149,0.35)]">
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-[0_0_14px_rgba(168,85,247,0.35)]">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v12m-4-8h8m4 2a8 8 0 11-16 0 8 8 0 0116 0z" />
                                        </svg>
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-white">Join. Participate. Earn.</p>
                                        <p className="mt-0.5 text-[11px] leading-4 text-slate-200">Be a part of our global survey network.</p>
                                    </div>
                                    <ArrowRightIcon />
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                                    <svg className="h-4 w-4 text-[#93C5FD]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
                                    </svg>
                                    <HomeLanguageSwitcher variant="compact" density="tight" />
                                </div>
                            </div>

                            <div className="mt-2">
                                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#A78BFA]">{t('layout.explore')}</p>
                                <nav className="flex flex-col gap-1">
                                    {siteNavItems.map(({ to, label, end }) => (
                                        <NavLink
                                            key={to}
                                            to={to}
                                            end={end}
                                            onClick={() => setMenuOpen(false)}
                                            className={({ isActive }) => mobileNavLinkClass(isActive)}
                                        >
                                            <DrawerRowIcon>
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14M13 5l7 7-7 7" />
                                                </svg>
                                            </DrawerRowIcon>
                                            <span className="ml-2 flex-1">{label}</span>
                                            <ArrowRightIcon />
                                        </NavLink>
                                    ))}
                                </nav>
                            </div>

                            <div className="my-4 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

                            <div>
                                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#A78BFA]">{t('layout.account')}</p>
                                <div className="flex flex-col gap-2">
                                    {authChecked && user ? (
                                        <button type="button" onClick={logout} className={mobileDrawerBtnLogout}>
                                            {t('layout.logout')}
                                        </button>
                                    ) : authChecked ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            <NavLink
                                                to={`/login?user_type=${drawerLoginAsPublisher ? 'publisher' : 'normal'}`}
                                                onClick={() => setMenuOpen(false)}
                                                className={mobileDrawerBtnLogin}
                                            >
                                                {t('layout.login')}
                                            </NavLink>
                                            <NavLink
                                                to={registerMemberTo}
                                                onClick={() => setMenuOpen(false)}
                                                className={mobileDrawerBtnSignup}
                                            >
                                                {t('layout.register')}
                                            </NavLink>

                                            <div className="col-span-2 mt-1 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
                                                <div className="flex items-center justify-between gap-2 py-1">
                                                    <span className="text-xs text-slate-200">Log in as Publisher</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDrawerLoginAsPublisher((s) => !s)}
                                                        className={[
                                                            drawerToggleTrackBase,
                                                            drawerLoginAsPublisher
                                                                ? 'border-[#8B5CF6]/80 bg-[#7C3AED]/45 shadow-[0_0_18px_rgba(124,58,237,0.5)]'
                                                                : 'border-white/20 bg-black/40',
                                                        ].join(' ')}
                                                    >
                                                        <span
                                                            className={[
                                                                drawerToggleThumbBase,
                                                                drawerLoginAsPublisher ? 'translate-x-[20px]' : 'translate-x-[2px]',
                                                            ].join(' ')}
                                                        />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 py-1">
                                                    <span className="text-xs text-slate-200">Remember me</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDrawerRememberMe((s) => !s)}
                                                        className={[
                                                            drawerToggleTrackBase,
                                                            drawerRememberMe
                                                                ? 'border-[#8B5CF6]/80 bg-[#7C3AED]/45 shadow-[0_0_18px_rgba(124,58,237,0.5)]'
                                                                : 'border-white/20 bg-black/40',
                                                        ].join(' ')}
                                                    >
                                                        <span
                                                            className={[
                                                                drawerToggleThumbBase,
                                                                drawerRememberMe ? 'translate-x-[20px]' : 'translate-x-[2px]',
                                                            ].join(' ')}
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                            <NavLink
                                                to={`/login?user_type=${drawerLoginAsPublisher ? 'publisher' : 'normal'}`}
                                                onClick={() => setMenuOpen(false)}
                                                className="col-span-2 mt-1 flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(124,58,237,0.45)] ring-1 ring-[#A78BFA]/45"
                                            >
                                                Log in
                                                <ArrowRightIcon />
                                            </NavLink>
                                            <p className="col-span-2 text-center text-[11px] text-slate-400">
                                                <NavLink to="/login/forgot-password" onClick={() => setMenuOpen(false)} className="hover:text-[#93C5FD]">
                                                    Forgot password?
                                                </NavLink>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="h-10 animate-pulse rounded-lg bg-white/5" aria-hidden />
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#8B5CF6]/40 bg-[#7C3AED]/18 text-[#C4B5FD] shadow-[0_0_20px_rgba(124,58,237,0.45)]">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4zm0 5v8m0 0l-3-3m3 3l3-3" />
                                        </svg>
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-white">Your Data, Our Priority</p>
                                        <p className="mt-1 text-[11px] leading-4 text-slate-300">
                                            Bank-level security to keep your information and earnings safe.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </header>

            <main className="relative z-10 flex-1 max-lg:pt-[calc(4.25rem+env(safe-area-inset-top,0px))] lg:pt-0">
                <Outlet />
            </main>

            <footer className="relative z-10 border-t border-white/[0.08] bg-[rgba(11,15,26,0.85)] backdrop-blur-md">
                <div className="mx-auto max-w-6xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-8 sm:px-6 sm:py-12 sm:pb-12">
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-3 lg:gap-10">
                        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
                            <NavLink to="/" className="inline-flex outline-none">
                                <AppLogo alt={appName} className="h-16 w-16 sm:h-20 sm:w-20" />
                            </NavLink>
                            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white sm:max-w-none">{t('layout.footerTagline')}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#93C5FD] sm:text-sm">{t('layout.quickLinks')}</p>
                            <ul className="mt-3 space-y-1.5 text-sm text-white sm:mt-4 sm:space-y-2">
                                <li>
                                    <NavLink to="/about" className="hover:text-white">
                                        {t('layout.nav.about')}
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to="/why-join-us" className="hover:text-white">
                                        {t('layout.nav.whyJoin')}
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to="/faqs" className="hover:text-white">
                                        {t('layout.nav.faqs')}
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to="/contact" className="hover:text-white">
                                        {t('layout.nav.contact')}
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to="/dashboard" className="hover:text-white">
                                        {t('layout.nav.dashboard')}
                                    </NavLink>
                                </li>
                            </ul>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#93C5FD] sm:text-sm">{t('layout.account')}</p>
                            <ul className="mt-3 space-y-1.5 text-sm text-white sm:mt-4 sm:space-y-2">
                                <li>
                                    <NavLink to="/dashboard" className="hover:text-white">
                                        {t('layout.nav.dashboard')}
                                    </NavLink>
                                </li>
                                {authChecked && user?.user_type === 'publisher' ? (
                                    <li>
                                        <NavLink to="/publisher" className="hover:text-[#93C5FD]">
                                            {t('layout.publisherDashboard')}
                                        </NavLink>
                                    </li>
                                ) : null}
                                {authChecked && user && user.user_type !== 'publisher' ? (
                                    <li>
                                        <NavLink to="/member" className="hover:text-[#93C5FD]">
                                            {t('layout.memberIncomePanel')}
                                        </NavLink>
                                    </li>
                                ) : null}
                                {authChecked && user ? (
                                    <li>
                                        <button type="button" onClick={logout} className="text-left hover:text-white">
                                            {t('layout.logout')}
                                        </button>
                                    </li>
                                ) : authChecked ? (
                                    <>
                                        <li>
                                            <NavLink to="/login" className="hover:text-white">
                                                {t('layout.login')}
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink to={registerMemberTo} className="hover:text-white">
                                                {t('layout.register')}
                                            </NavLink>
                                        </li>
                                    </>
                                ) : null}
                                <li>
                                    <span className="cursor-default hover:text-slate-400">{t('layout.termsFooter')}</span>
                                </li>
                                <li>
                                    <span className="cursor-default hover:text-slate-400">{t('layout.privacy')}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <p className="mt-8 border-t border-white/[0.08] pt-6 text-center text-[11px] leading-snug text-slate-500 sm:mt-10 sm:pt-8 sm:text-sm">
                        {t('layout.copyright', { year: new Date().getFullYear(), name: appName })}
                    </p>
                </div>
            </footer>
        </div>
    );
}

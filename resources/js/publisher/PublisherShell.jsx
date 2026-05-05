import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AppLogo from '../components/AppLogo';
import HomeLanguageSwitcher from '../components/HomeLanguageSwitcher';
import { fetchSessionUser, prepareSanctum } from '../lib/auth';
import { pub } from './ui/pubTheme';

const GRADIENT_ACTIVE = { background: 'linear-gradient(135deg, #6C4CF1, #8E6BFF)' };

const sidebarNav = [
    { to: '/publisher', label: 'Dashboard', end: true, icon: IconHome },
    { to: '/publisher/surveys', label: 'Surveys', icon: IconDoc },
    { to: '/publisher/create', label: 'Create Survey', icon: IconPlus },
    { to: '/publisher/audience', label: 'Audience / Users', icon: IconUsers },
    { to: '/publisher/earnings', label: 'Earnings', icon: IconMoney },
    { to: '/publisher/wallet/deposit', label: 'Deposit', icon: IconDeposit },
    { to: '/publisher/analytics', label: 'Analytics', icon: IconChart },
    { to: '/publisher/notifications', label: 'Notifications', icon: IconBell },
    { to: '/publisher/settings', label: 'Settings', icon: IconGear },
];

/** Mobile bottom bar — same theme, subset of routes */
const mobileNav = [
    { to: '/publisher', label: 'Home', end: true, icon: IconHome },
    { to: '/publisher/surveys', label: 'Surveys', icon: IconDoc },
    { to: '/publisher/create', label: 'Create', icon: IconPlus, accent: true },
    { to: '/publisher/wallet/deposit', label: 'Deposit', icon: IconDeposit },
    { to: '/publisher/analytics', label: 'Stats', icon: IconChart },
    { to: '/publisher/settings', label: 'Settings', icon: IconGear },
];

function IconHome() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    );
}
function IconDoc() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    );
}
function IconPlus() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
    );
}
function IconUsers() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    );
}
function IconMoney() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}
function IconDeposit() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
            />
        </svg>
    );
}
function IconChart() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    );
}
function IconBell() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
    );
}
function IconGear() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}
function IconSearch() {
    return (
        <svg className="h-5 w-5 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );
}
function IconChevron() {
    return (
        <svg className="h-4 w-4 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    );
}
function IconPanel() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
    );
}

function sidebarItemClass(isActive, collapsed) {
    return [
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200',
        collapsed ? 'justify-center' : '',
        isActive ? 'text-white' : pub.navIdle,
    ].join(' ');
}

export default function PublisherShell() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(undefined);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('rms-publisher-sidebar') === '1');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

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
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [location.pathname]);

    useEffect(() => {
        localStorage.setItem('rms-publisher-sidebar', collapsed ? '1' : '0');
    }, [collapsed]);

    useEffect(() => {
        function onDocClick(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, []);

    async function logout() {
        try {
            await prepareSanctum();
            await window.axios.post('api/logout');
        } catch {
            /* ignore */
        }
        setMenuOpen(false);
        navigate('/login?user_type=publisher', { replace: true });
    }

    if (user === undefined) {
        return (
            <div className={`flex min-h-dvh w-full max-w-[100vw] items-center justify-center overflow-x-hidden ${pub.bg}`}>
                <p className={pub.muted}>Loading…</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login?user_type=publisher" state={{ from: location }} replace />;
    }

    if (user.user_type !== 'publisher') {
        return <Navigate to="/member" replace />;
    }

    return (
        <div className={`min-h-dvh w-full max-w-[100vw] overflow-x-hidden font-sans antialiased ${pub.bg} ${pub.page}`}>
            {sidebarOpen ? (
                <button
                    type="button"
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    aria-label="Close menu"
                    onClick={() => setSidebarOpen(false)}
                />
            ) : null}

            <aside
                className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-[#2A3550] bg-[#111827]/95 backdrop-blur-xl transition-[width,transform] duration-200 lg:z-30 ${
                    collapsed ? 'w-[72px]' : 'w-[272px]'
                } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            >
                <div className="flex h-16 items-center border-b border-[#2A3550] px-3">
                    <Link to="/publisher" className="flex min-w-0 items-center gap-2 font-semibold text-white">
                        <AppLogo alt="RM Survey Publisher" className={collapsed ? 'h-12 w-12' : 'h-14 w-14'} />
                        {!collapsed ? <span className="truncate text-sm">RM Survey · Publisher</span> : null}
                    </Link>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto p-2">
                    {sidebarNav.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => sidebarItemClass(isActive, collapsed)}
                            style={({ isActive }) => (isActive ? GRADIENT_ACTIVE : {})}
                        >
                            <item.icon />
                            {!collapsed ? item.label : null}
                        </NavLink>
                    ))}
                </nav>

                <div className="border-t border-[#2A3550] p-2">
                    {!collapsed ? (
                        <div className="mb-2 px-1">
                            <HomeLanguageSwitcher variant="compact" />
                        </div>
                    ) : null}
                    <button
                        type="button"
                        onClick={logout}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 transition duration-200 hover:bg-red-500/10 ${
                            collapsed ? 'justify-center' : ''
                        }`}
                    >
                        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {!collapsed ? 'Logout' : null}
                    </button>
                </div>
            </aside>

            <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[272px]'}`}>
                <header
                    className={`flex h-16 shrink-0 items-center gap-3 px-3 sm:px-5 max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:z-50 max-lg:pt-[env(safe-area-inset-top,0px)] lg:sticky lg:top-0 lg:z-20 lg:pt-0 ${pub.glassHeader}`}
                >
                    <button
                        type="button"
                        className="rounded-xl p-2 text-white transition hover:bg-white/[0.06] lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open menu"
                    >
                        <IconPanel />
                    </button>
                    <button
                        type="button"
                        className="hidden rounded-xl p-2 text-white transition hover:bg-white/[0.06] lg:block"
                        onClick={() => setCollapsed((c) => !c)}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <IconPanel />
                    </button>

                    <div
                        className={`relative flex flex-1 items-center rounded-full border border-[#2A3550] bg-[#1A2235] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-[#7C5CFF] focus-within:ring-2 focus-within:ring-[#7C5CFF]/20`}
                    >
                        <IconSearch />
                        <input
                            type="search"
                            placeholder="Search surveys, users…"
                            className="ml-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-[#9CA3AF]/55"
                        />
                    </div>

                    <div className="shrink-0 min-w-0 max-w-[min(42vw,9.5rem)] sm:max-w-none">
                        <HomeLanguageSwitcher variant="compact" />
                    </div>

                    <Link
                        to="/publisher/notifications"
                        className="relative rounded-full p-2 text-white transition hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(124,92,255,0.2)]"
                        aria-label="Notifications"
                    >
                        <IconBell />
                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#111827]" />
                    </Link>

                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setMenuOpen((o) => !o)}
                            className="flex items-center gap-2 rounded-full border border-[#2A3550] bg-[#1A2235] py-1 pl-1 pr-2 transition hover:border-[#7C5CFF]/40 hover:shadow-[0_0_20px_rgba(124,92,255,0.15)]"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#6C4CF1] to-[#8E6BFF] text-xs font-bold text-white shadow-[0_0_16px_rgba(124,92,255,0.4)]">
                                {(user.name || user.email || '?').charAt(0).toUpperCase()}
                            </span>
                            <IconChevron />
                        </button>
                        {menuOpen ? (
                            <div className="absolute right-0 z-[120] mt-2 w-52 overflow-hidden rounded-2xl border border-[#2A3550] bg-[#111827] py-1 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
                                <Link
                                    to="/publisher/settings"
                                    className="block px-4 py-2.5 text-sm text-[#9CA3AF] transition hover:bg-[#1A2235] hover:text-white"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Profile
                                </Link>
                                <Link
                                    to="/publisher/settings"
                                    className="block px-4 py-2.5 text-sm text-[#9CA3AF] transition hover:bg-[#1A2235] hover:text-white"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Settings
                                </Link>
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-400 transition hover:bg-red-500/10"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : null}
                    </div>
                </header>

                <main className="p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8 lg:pb-8 max-lg:!pt-[calc(4rem+1rem+env(safe-area-inset-top,0px))] sm:max-lg:!pt-[calc(4rem+1.5rem+env(safe-area-inset-top,0px))]">
                    <Outlet context={{ user }} />
                </main>
            </div>

            {/* Mobile bottom navigation — same visual language */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#2A3550] bg-[#111827]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden"
                aria-label="Primary"
            >
                <div className="mx-auto flex max-w-lg items-end justify-between gap-0.5">
                    {mobileNav.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={`group flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition duration-200 ${
                                item.accent ? '-mt-3' : ''
                            }`}
                        >
                            {({ isActive }) => (
                                <>
                                    <span
                                        className={[
                                            'flex items-center justify-center rounded-xl transition duration-200',
                                            item.accent ? 'h-11 w-11' : 'h-9 w-9',
                                            isActive
                                                ? 'bg-gradient-to-r from-[#6C4CF1] to-[#8E6BFF] text-white shadow-[0_0_22px_rgba(124,92,255,0.45)]'
                                                : 'bg-[#1A2235] text-[#9CA3AF] group-hover:text-white group-hover:shadow-[0_0_16px_rgba(124,92,255,0.15)]',
                                        ].join(' ')}
                                    >
                                        <item.icon />
                                    </span>
                                    <span
                                        className={`truncate text-[10px] font-semibold ${
                                            isActive ? 'text-white' : 'text-[#9CA3AF] group-hover:text-white'
                                        }`}
                                    >
                                        {item.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import HomeLanguageSwitcher from '../components/HomeLanguageSwitcher';
import AppLogo from '../components/AppLogo';
import { fetchSessionUser, prepareSanctum } from '../lib/auth';
import RmsPageBackdrop from './components/RmsPageBackdrop';

const programmeNavConfig = [
    { to: '/member/direct-income', labelKey: 'member.nav.directIncome', icon: IconUsers },
    { to: '/member/panel-matching', labelKey: 'member.nav.panelMatching', icon: IconScale },
    { to: '/member/sub-panel-matching', labelKey: 'member.nav.subPanelMatching', icon: IconGrid },
    { to: '/member/super-sub-panel-matching', labelKey: 'member.nav.superSubPanel', icon: IconStack },
    { to: '/member/level-income', labelKey: 'member.nav.levelIncome', icon: IconLevels },
    { to: '/member/terms', labelKey: 'member.nav.terms', icon: IconDoc },
];

/** Bottom bar + sidebar top: 4 quick links + More (transactions, panels, profile). */
const primaryNavQuickConfig = [
    { to: '/member', labelKey: 'member.nav.dashboard', end: true, icon: IconHome },
    { to: '/member/team', labelKey: 'member.nav.team', icon: IconTeam },
    { to: '/member/surveys', labelKey: 'member.nav.surveys', icon: IconSurvey },
    { to: '/member/wallet', labelKey: 'member.nav.wallet', icon: IconWalletNav },
];

const primaryNavMoreConfig = [
    { to: '/member/transactions', labelKey: 'member.nav.transactions', icon: IconTransactionsNav },
    { to: '/member/support-tickets', labelKey: 'member.nav.supportTickets', icon: IconSupportTicket },
    { to: '/member/profile', labelKey: 'member.nav.profile', icon: IconUser },
];

/** Mobile More sheet only — same icons/theme as programme nav; desktop lists these under Programme. */
const primaryNavMoreMobileExtraConfig = [];

const moreMenuMetaByRoute = {
    '/member/transactions': { subtitle: 'Wallet and earnings', glow: 'from-[#7C3AED]/28 to-[#3B82F6]/12', ring: 'ring-[#8B5CF6]/45' },
    '/member/support-tickets': { subtitle: 'Help and issues', glow: 'from-[#6D28D9]/28 to-[#8B5CF6]/12', ring: 'ring-[#A78BFA]/40' },
    '/member/active-panels': { subtitle: 'Activation status', glow: 'from-[#7C3AED]/28 to-[#4C1D95]/12', ring: 'ring-[#8B5CF6]/45' },
    '/member/sub-panels': { subtitle: 'Sub panel management', glow: 'from-[#8B5CF6]/26 to-[#4C1D95]/10', ring: 'ring-[#A78BFA]/40' },
    '/member/super-sub-panels': { subtitle: 'Super hierarchy', glow: 'from-[#9333EA]/26 to-[#6D28D9]/10', ring: 'ring-[#C4B5FD]/35' },
    '/member/profile': { subtitle: 'Profile and security', glow: 'from-[#7C3AED]/26 to-[#A855F7]/10', ring: 'ring-[#C4B5FD]/35' },
    '/member/panel-matching': { subtitle: 'Matching rewards', glow: 'from-[#5B21B6]/26 to-[#7C3AED]/10', ring: 'ring-[#8B5CF6]/40' },
    '/member/sub-panel-matching': { subtitle: 'Sub matching analytics', glow: 'from-[#6D28D9]/26 to-[#3B82F6]/10', ring: 'ring-[#A78BFA]/35' },
    '/member/super-sub-panel-matching': { subtitle: 'Super matching analytics', glow: 'from-[#7C3AED]/26 to-[#EC4899]/10', ring: 'ring-[#C4B5FD]/35' },
};

const MORE_PATH_PREFIXES = [
    '/member/transactions',
    '/member/support-tickets',
    '/member/active-panels',
    '/member/sub-panels',
    '/member/super-sub-panels',
    '/member/panel-matching',
    '/member/sub-panel-matching',
    '/member/super-sub-panel-matching',
    '/member/profile',
];

function isMoreMenuPath(pathname) {
    return MORE_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function IconHome({ active }) {
    const c = active ? '#8E6BFF' : '#A0AEC0';
    return (
        <svg className="h-5 w-5 shrink-0 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    );
}

function IconTeam({ active }) {
    const c = active ? '#8E6BFF' : '#A0AEC0';
    return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.09 9.09 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
        </svg>
    );
}

function IconSurvey({ active }) {
    const c = active ? '#8E6BFF' : '#A0AEC0';
    return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 18H15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0015 4.5h-4.5A2.25 2.25 0 006.75 6.75v12A2.25 2.25 0 009 21z"
            />
        </svg>
    );
}

/** Active panels — grid tiles */
function IconPanels({ active }) {
    const c = active ? '#8E6BFF' : '#A0AEC0';
    return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5zM14 15a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5a1 1 0 01-1-1v-5z" />
        </svg>
    );
}

/** Super panels — stacked tiers */
function IconSuperSubPanels({ active }) {
    const c = active ? '#C084FC' : '#A0AEC0';
    return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 11h8M8 15h5M8 19h5M16 15v4l2 2M18 21v-4" />
        </svg>
    );
}

/** Sub panels — 3×3 grid hint */
function IconSubPanels({ active }) {
    const c = active ? '#F59E0B' : '#A0AEC0';
    return (
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill={c} aria-hidden>
            {[0, 1, 2].map((row) =>
                [0, 1, 2].map((col) => (
                    <rect key={`${row}-${col}`} x={3.5 + col * 6.5} y={3.5 + row * 6.5} width="5" height="5" rx="1" />
                )),
            )}
        </svg>
    );
}

/** Transactions — receipt list (bottom nav + sidebar). */
function IconTransactionsNav({ active }) {
    const c = active ? '#8E6BFF' : '#A0AEC0';
    return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75} aria-hidden>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
        </svg>
    );
}

function IconWalletNav({ active }) {
    const c = active ? '#8E6BFF' : '#A0AEC0';
    return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 3h-4.5M3 12H9"
            />
        </svg>
    );
}

function IconUser({ active }) {
    const c = active ? '#8E6BFF' : '#A0AEC0';
    return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
        </svg>
    );
}

/** More menu — 3×3 dots */
function IconMore({ active }) {
    const c = active ? '#8E6BFF' : '#A0AEC0';
    return (
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill={c} aria-hidden>
            {[0, 1, 2].flatMap((row) =>
                [0, 1, 2].map((col) => (
                    <circle key={`${row}-${col}`} cx={6 + col * 6} cy={6 + row * 6} r="1.75" />
                )),
            )}
        </svg>
    );
}

function IconUsers() {
    return (
        <svg className="h-5 w-5 shrink-0 text-[#A0AEC0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
        </svg>
    );
}
function IconScale({ active }) {
    const c = active ? '#8E6BFF' : '#A0AEC0';
    return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            />
        </svg>
    );
}
function IconGrid({ active }) {
    const c = active ? '#8E6BFF' : '#A0AEC0';
    return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
        </svg>
    );
}
function IconStack({ active }) {
    const c = active ? '#8E6BFF' : '#A0AEC0';
    return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6h12M6 10h12m-6 4h6m-6 4h6M6 14h.01M6 18h.01"
            />
        </svg>
    );
}
function IconLayers() {
    return (
        <svg className="h-5 w-5 shrink-0 text-[#A0AEC0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
        </svg>
    );
}
function IconLevels() {
    return (
        <svg className="h-5 w-5 shrink-0 text-[#A0AEC0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
    );
}
function IconDoc() {
    return (
        <svg className="h-5 w-5 shrink-0 text-[#A0AEC0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
        </svg>
    );
}

function IconSupportTicket({ active }) {
    const c = active ? '#8E6BFF' : '#A0AEC0';
    return (
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75} aria-hidden>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 12a8.25 8.25 0 10-3.19 6.52L21 21l-2.48-3.94A8.217 8.217 0 0020.25 12zM8.25 10.5h7.5M8.25 13.5h5.25"
            />
        </svg>
    );
}

function sidebarPrimaryClass(isActive) {
    return [
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition duration-200',
        isActive
            ? 'bg-gradient-to-r from-[#6C4CF1]/40 to-[#8E6BFF]/25 text-white shadow-[0_0_24px_rgba(108,76,241,0.2)] ring-1 ring-[#8E6BFF]/35'
            : 'text-[#A0AEC0] hover:bg-white/[0.06] hover:text-white',
    ].join(' ');
}

function sidebarProgrammeClass(isActive) {
    return [
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition duration-200',
        isActive ? 'bg-white/[0.08] text-white' : 'text-[#A0AEC0] hover:bg-white/[0.04] hover:text-white',
    ].join(' ');
}

export default function MemberShell() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(undefined);
    const [menuOpen, setMenuOpen] = useState(false);
    const [moreSheetOpen, setMoreSheetOpen] = useState(false);
    const [moreActionMsg, setMoreActionMsg] = useState('');
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
        function onDocClick(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, []);

    useEffect(() => {
        setMoreSheetOpen(false);
    }, [location.pathname]);

    const programmeNav = useMemo(
        () => programmeNavConfig.map((item) => ({ ...item, label: t(item.labelKey) })),
        [t, i18n.resolvedLanguage],
    );
    const primaryNavQuick = useMemo(
        () => primaryNavQuickConfig.map((item) => ({ ...item, label: t(item.labelKey) })),
        [t, i18n.resolvedLanguage],
    );
    const primaryNavMoreItems = useMemo(
        () => primaryNavMoreConfig.map((item) => ({ ...item, label: t(item.labelKey) })),
        [t, i18n.resolvedLanguage],
    );
    const primaryNavMoreItemsMobile = useMemo(
        () =>
            [...primaryNavMoreConfig, ...primaryNavMoreMobileExtraConfig].map((item) => ({ ...item, label: t(item.labelKey) })),
        [t, i18n.resolvedLanguage],
    );
    const referralUrl = useMemo(() => {
        const code = user?.referral_code;
        if (!code) return '';
        const base = (window?.location?.origin || '').replace(/\/$/, '');
        if (!base) return '';
        return `${base}/register?ref=${encodeURIComponent(code)}`;
    }, [user?.referral_code]);

    function showMoreActionMsg(message) {
        setMoreActionMsg(message);
        window.setTimeout(() => setMoreActionMsg(''), 1800);
    }

    async function copyReferralLink() {
        if (!referralUrl) return;
        try {
            await navigator.clipboard.writeText(referralUrl);
            showMoreActionMsg('Referral link copied');
        } catch {
            showMoreActionMsg('Copy failed');
        }
    }

    async function shareReferralLink() {
        if (!referralUrl) return;
        try {
            if (navigator.share) {
                await navigator.share({ title: 'RM Survey', text: 'Join RM Survey', url: referralUrl });
                showMoreActionMsg('Referral link shared');
                return;
            }
            await copyReferralLink();
        } catch {
            /* share cancelled */
        }
    }

    async function logout() {
        try {
            await prepareSanctum();
            await window.axios.post('api/logout');
        } catch {
            /* ignore */
        }
        setMenuOpen(false);
        navigate('/login?user_type=normal', { replace: true });
    }

    if (user === undefined) {
        return (
            <div className="relative flex min-h-dvh w-full max-w-[100vw] items-center justify-center overflow-x-hidden bg-[#0B0F1A] font-[Inter,Poppins,system-ui,sans-serif] text-[#A0AEC0]">
                <RmsPageBackdrop />
                <p className="relative">{t('member.loading')}</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login?user_type=normal" state={{ from: location }} replace />;
    }

    if (user.user_type === 'publisher') {
        return <Navigate to="/publisher" replace />;
    }

    return (
        <div className="relative min-h-dvh w-full max-w-[100vw] overflow-x-hidden bg-[#0B0F1A] font-[Inter,Poppins,system-ui,sans-serif] text-white antialiased">
            <RmsPageBackdrop />

            {/* Desktop sidebar */}
            <aside className="fixed left-0 top-0 z-30 hidden h-full w-[280px] flex-col border-r border-white/[0.08] bg-[#0B0F1A]/95 backdrop-blur-xl lg:flex">
                <div className="flex h-16 items-center gap-2 border-b border-white/[0.08] px-4">
                    <Link to="/member" className="flex min-w-0 items-center gap-2 font-semibold text-white">
                        <AppLogo alt="RM Survey" className="h-14 w-14 shrink-0" />
                        <span className="truncate text-sm">{t('layout.nav.rmSurvey')}</span>
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-3">
                    <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#A0AEC0]">{t('member.sectionMain')}</p>
                    <nav className="space-y-1">
                        {primaryNavQuick.map((item) => (
                            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => sidebarPrimaryClass(isActive)}>
                                {({ isActive }) => (
                                    <>
                                        <item.icon active={isActive} />
                                        <span>{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#A0AEC0]">{t('member.more')}</p>
                    <nav className="space-y-1">
                        {primaryNavMoreItems.map((item) => (
                            <NavLink key={item.to} to={item.to} className={({ isActive }) => sidebarPrimaryClass(isActive)}>
                                {({ isActive }) => (
                                    <>
                                        <item.icon active={isActive} />
                                        <span>{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#A0AEC0]">{t('member.sectionProgramme')}</p>
                    <nav className="space-y-0.5">
                        {programmeNav.map((item) => (
                            <NavLink key={item.to} to={item.to} className={({ isActive }) => sidebarProgrammeClass(isActive)}>
                                <item.icon />
                                <span className="leading-tight">{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div className="border-t border-white/[0.08] p-2">
                    <div className="mb-2 px-1">
                        <HomeLanguageSwitcher variant="compact" />
                    </div>
                    <button
                        type="button"
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                    >
                        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t('member.logout')}
                    </button>
                </div>
            </aside>

            <div className="relative lg:pl-[280px]">
                <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/[0.08] bg-[#0B0F1A]/95 px-3.5 backdrop-blur-xl max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:left-0 max-lg:right-0 max-lg:z-[90] max-lg:pt-[env(safe-area-inset-top,0px)] lg:sticky lg:top-0 lg:z-20 lg:bg-[#0B0F1A]/90 lg:pt-0">
                    <div className="min-w-0 flex-1 lg:hidden">
                        <Link to="/member" className="flex items-center gap-2">
                            <AppLogo alt="RM Survey" className="h-12 w-12" />
                            <span className="truncate text-sm font-semibold">{t('layout.nav.rmSurvey')}</span>
                        </Link>
                    </div>
                    <div className="hidden min-w-0 flex-1 lg:block">
                        <p className="truncate text-sm font-medium text-white">{t('member.roleLabel')}</p>
                        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[#A0AEC0]">{t('member.brandSubtitle')}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <HomeLanguageSwitcher variant="compact" />
                    </div>

                    <Link to="/" className="hidden text-sm text-[#A0AEC0] transition hover:text-white lg:block">
                        {t('member.website')}
                    </Link>

                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setMenuOpen((o) => !o)}
                            className="flex items-center gap-2 rounded-full border border-white/10 bg-[#111827] py-1 pl-1 pr-2 transition hover:border-[#8E6BFF]/35"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#6C4CF1] to-[#8E6BFF] text-xs font-bold text-white">
                                {(user.name || user.email || '?').charAt(0).toUpperCase()}
                            </span>
                            <svg className="h-4 w-4 text-[#A0AEC0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {menuOpen ? (
                            <div className="absolute right-0 z-[120] mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#111827] py-1 shadow-xl shadow-black/40">
                                <Link
                                    to="/member/profile"
                                    className="block px-4 py-2 text-sm text-white hover:bg-white/5"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    {t('member.profile')}
                                </Link>
                                <Link
                                    to="/member/terms"
                                    className="block px-4 py-2 text-sm text-[#A0AEC0] hover:bg-white/5 hover:text-white"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    {t('member.terms')}
                                </Link>
                                <button type="button" onClick={logout} className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10">
                                    {t('member.logout')}
                                </button>
                            </div>
                        ) : null}
                    </div>
                </header>

                <main className="relative mx-auto max-w-6xl px-3 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:px-4 lg:pb-8 max-lg:pt-[calc(3.25rem+1rem+env(safe-area-inset-top,0px))] sm:max-lg:pt-[calc(3.25rem+1.25rem+env(safe-area-inset-top,0px))] lg:pt-4">
                    <Outlet key={i18n.resolvedLanguage} context={{ dark: true }} />
                </main>
            </div>

            {/* Mobile bottom: 4 quick + More (transactions, panels, profile) */}
            <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t border-white/[0.08] bg-[rgba(11,15,26,0.92)] shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-2xl max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 lg:hidden">
                <div className="mx-auto flex max-w-lg items-end justify-around gap-0.5 px-1 pb-2.5 pt-1.5 [padding-bottom:max(0.65rem,env(safe-area-inset-bottom))]">
                    {primaryNavQuick.map(({ to, label, end, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className="flex min-w-0 flex-1 flex-col items-center justify-end active:scale-[0.97] active:opacity-90"
                        >
                            {({ isActive }) => (
                                <span
                                    className={[
                                        'flex w-full max-w-[5.25rem] flex-col items-center gap-1 rounded-[14px] px-2 py-2 text-center text-[10px] font-semibold transition-all duration-200',
                                        isActive
                                            ? 'bg-[rgba(108,76,241,0.22)] text-[#C4B5FD] shadow-[0_0_20px_rgba(108,76,241,0.18)] ring-1 ring-[rgba(142,107,255,0.55)]'
                                            : 'text-[#A0AEC0]',
                                    ].join(' ')}
                                >
                                    <Icon active={isActive} />
                                    <span className="max-w-[4.5rem] truncate leading-tight">{label}</span>
                                </span>
                            )}
                        </NavLink>
                    ))}
                    <button
                        type="button"
                        onClick={() => setMoreSheetOpen(true)}
                        className="flex min-w-0 flex-1 flex-col items-center justify-end active:scale-[0.97] active:opacity-90"
                    >
                        <span
                            className={[
                                'flex w-full max-w-[5.25rem] flex-col items-center gap-1 rounded-[14px] px-2 py-2 text-center text-[10px] font-semibold transition-all duration-200',
                                isMoreMenuPath(location.pathname)
                                    ? 'bg-[rgba(108,76,241,0.22)] text-[#C4B5FD] shadow-[0_0_20px_rgba(108,76,241,0.18)] ring-1 ring-[rgba(142,107,255,0.55)]'
                                    : 'text-[#A0AEC0]',
                            ].join(' ')}
                        >
                            <IconMore active={isMoreMenuPath(location.pathname)} />
                            <span className="max-w-[4.5rem] truncate leading-tight">{t('member.more')}</span>
                        </span>
                    </button>
                </div>
            </nav>

            {/* Mobile More sheet */}
            {moreSheetOpen ? (
                <div className="fixed inset-0 z-[110] lg:hidden" role="dialog" aria-modal="true" aria-label={t('member.moreNavAria')}>
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setMoreSheetOpen(false)}
                        aria-label={t('common.closeMenu')}
                    />
                    <div className="absolute inset-x-0 bottom-0 max-h-[84vh] overflow-y-auto rounded-t-[22px] border border-white/[0.12] bg-gradient-to-b from-[#040712]/98 via-[#090f1f]/98 to-[#0a1120]/98 shadow-[0_-20px_44px_rgba(0,0,0,0.62)]">
                        <div className="pointer-events-none absolute inset-0">
                            <span className="absolute left-6 top-14 h-2 w-2 rounded-full bg-violet-300/80 blur-[1px]" />
                            <span className="absolute right-8 top-24 h-1.5 w-1.5 rounded-full bg-fuchsia-300/70 blur-[1px]" />
                            <span className="absolute right-16 top-10 h-1 w-1 rounded-full bg-indigo-300/80 blur-[1px]" />
                        </div>
                        <div className="flex justify-center pb-1.5 pt-2">
                            <span className="h-1.5 w-10 rounded-full bg-gradient-to-r from-[#7C3AED]/80 to-[#3B82F6]/70 shadow-[0_0_14px_rgba(124,58,237,0.5)]" />
                        </div>
                        <div className="relative overflow-hidden px-3 pb-2 pt-0.5 text-center">
                            <button
                                type="button"
                                onClick={() => setMoreSheetOpen(false)}
                                className="absolute left-0 top-0 inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-[#CBD5E1] transition hover:border-violet-300/35 hover:text-white"
                            >
                                <span aria-hidden>←</span> Back
                            </button>
                            <div className="pointer-events-none absolute left-6 top-2 h-2 w-2 rounded-full bg-[#8B5CF6]/70 blur-[1px]" />
                            <div className="pointer-events-none absolute right-8 top-6 h-1.5 w-1.5 rounded-full bg-cyan-300/70 blur-[1px]" />
                            <p className="text-[14px] font-bold tracking-tight text-white">More Options</p>
                            <p className="mt-0.5 text-[10px] text-[#94A3B8]">Manage your account & earnings</p>
                        </div>
                        {referralUrl ? (
                            <div className="mx-2 mb-2 rounded-lg border border-violet-300/20 bg-[#0b1020]/75 p-2 backdrop-blur-xl">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-200/85">Referral link</p>
                                <p className="mt-1 truncate rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-[#A0AEC0]">{referralUrl}</p>
                                <div className="mt-2 grid grid-cols-2 gap-1.5">
                                    <button
                                        type="button"
                                        onClick={copyReferralLink}
                                        className="rounded-md border border-violet-300/25 bg-violet-500/10 px-2 py-1.5 text-[10px] font-semibold text-violet-100 transition hover:border-violet-300/45"
                                    >
                                        Copy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={shareReferralLink}
                                        className="rounded-md border border-violet-300/25 bg-violet-500/10 px-2 py-1.5 text-[10px] font-semibold text-violet-100 transition hover:border-violet-300/45"
                                    >
                                        Share
                                    </button>
                                </div>
                                {moreActionMsg ? <p className="mt-1 text-[10px] text-emerald-300">{moreActionMsg}</p> : null}
                            </div>
                        ) : null}
                        <ul className="grid auto-rows-fr grid-cols-2 gap-1.5 px-2 pb-2.5">
                            {primaryNavMoreItemsMobile.map(({ to, label, icon: Icon }, idx) => (
                                <li key={to} className={idx === primaryNavMoreItemsMobile.length - 1 && primaryNavMoreItemsMobile.length % 2 === 1 ? 'col-span-2' : ''}>
                                    <NavLink
                                        to={to}
                                        onClick={() => setMoreSheetOpen(false)}
                                        className={({ isActive }) => {
                                            const meta = moreMenuMetaByRoute[to] ?? {
                                                subtitle: 'Open section',
                                                glow: 'from-[#7C3AED]/20 to-[#3B82F6]/10',
                                                ring: 'ring-[#8B5CF6]/35',
                                            };
                                            return (
                                            [
                                                'group relative flex h-full min-h-[70px] items-start overflow-hidden rounded-lg border px-2 py-2 text-left transition-all duration-300 backdrop-blur-xl',
                                                'bg-[linear-gradient(160deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))]',
                                                isActive
                                                    ? `border-white/20 text-white ring-1 ${meta.ring} shadow-[0_12px_30px_rgba(0,0,0,0.48)]`
                                                    : 'border-white/10 text-[#CBD5E1] hover:border-violet-300/35 hover:text-white hover:shadow-[0_10px_26px_rgba(0,0,0,0.35)]',
                                            ].join(' ')
                                            );
                                        }}
                                    >
                                        {({ isActive }) => {
                                            const meta = moreMenuMetaByRoute[to] ?? { subtitle: 'Open section', glow: 'from-[#7C3AED]/20 to-[#3B82F6]/10' };
                                            return (
                                            <>
                                                <div className={`pointer-events-none absolute -left-8 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-gradient-to-r ${meta.glow} opacity-45 blur-2xl`} />
                                                <div className="flex items-start gap-1.5">
                                                    <span
                                                        className={[
                                                            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-white/[0.04] shadow-[0_0_14px_rgba(124,58,237,0.15)]',
                                                            isActive ? 'border-white/25' : 'border-white/15',
                                                        ].join(' ')}
                                                    >
                                                        <Icon active={isActive} />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-[11px] font-semibold">{label}</p>
                                                        <p className="mt-0.5 line-clamp-1 text-[9px] text-[#94A3B8]">{meta.subtitle}</p>
                                                    </div>
                                                    <span className="mt-0.5 inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-violet-300/20 bg-violet-500/10 text-[#A78BFA] transition group-hover:translate-x-0.5 group-hover:border-violet-300/45 group-hover:bg-violet-500/20">
                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </span>
                                                </div>
                                            </>
                                            );
                                        }}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                        <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]" />
                    </div>
                </div>
            ) : null}
        </div>
    );
}

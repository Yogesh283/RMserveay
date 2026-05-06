import { NavLink, Outlet } from 'react-router-dom';
import AppLogo from '../components/AppLogo';
import HomeLanguageSwitcher from '../components/HomeLanguageSwitcher';

const BRAND = 'RM Survey';

const ACTIVE_STROKE = '#8E6BFF';
const INACTIVE = 'rgba(160,174,192,0.65)';

const tabs = [
    { to: '/survey/dashboard', label: 'Dashboard', icon: IconHome },
    { to: '/survey/team', label: 'Team', icon: IconTeam },
    { to: '/survey/surveys', label: 'Surveys', icon: IconSurvey },
    { to: '/survey/wallet', label: 'Wallet', icon: IconWallet },
    { to: '/survey/more', label: 'More', icon: IconMore },
];

function IconHome({ active }) {
    const c = active ? ACTIVE_STROKE : INACTIVE;
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
    );
}

function IconSurvey({ active }) {
    const c = active ? ACTIVE_STROKE : INACTIVE;
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 18H15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0015 4.5h-4.5A2.25 2.25 0 006.75 6.75v12A2.25 2.25 0 009 21z" />
        </svg>
    );
}

function IconWallet({ active }) {
    const c = active ? ACTIVE_STROKE : INACTIVE;
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 3h-4.5M3 12H9m0 0H5.25m3.75 0v-.857c0-1.068.83-1.935 1.864-1.935 1.034 0 1.865.867 1.865 1.935V12M9 12h6" />
        </svg>
    );
}

function IconTeam({ active }) {
    const c = active ? ACTIVE_STROKE : INACTIVE;
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.09 9.09 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
    );
}

function IconMore({ active }) {
    const c = active ? ACTIVE_STROKE : INACTIVE;
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke={c} strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
    );
}

export default function MobileShell() {
    return (
        <div className="rm-survey min-h-dvh w-full max-w-[100vw] overflow-x-hidden bg-[#0B0F1A] pb-28 font-[Inter,Poppins,system-ui,sans-serif] text-white antialiased">
            <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[#0B0F1A] via-[#0F172A] to-[#070b14]" aria-hidden />
            <div
                className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,rgba(108,76,241,0.22),transparent_50%)]"
                aria-hidden
            />
            <div
                className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_100%_30%,rgba(142,107,255,0.1),transparent_40%)]"
                aria-hidden
            />
            <div className="relative mx-auto min-h-dvh w-full max-w-md shadow-[0_0_100px_rgba(0,0,0,0.65)]">
                <Outlet />
            </div>

            <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t border-white/[0.08] bg-[rgba(11,15,26,0.88)] backdrop-blur-2xl">
                <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-4 pb-1 pt-2">
                    <AppLogo alt={BRAND} className="h-11 w-11 shrink-0 opacity-90" />
                    <HomeLanguageSwitcher variant="compact" />
                </div>
                <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pb-3 pt-1">
                    {tabs.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/survey/dashboard'}
                            className={({ isActive }) =>
                                [
                                    'flex flex-1 flex-col items-center gap-1 rounded-[18px] px-1.5 py-2 text-[10px] font-semibold transition-all duration-200',
                                    isActive
                                        ? 'text-white'
                                        : 'text-[#A0AEC0] hover:text-white',
                                ].join(' ')
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span
                                        className={[
                                            'flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200',
                                            isActive
                                                ? 'bg-[linear-gradient(160deg,rgba(124,58,237,0.46),rgba(59,130,246,0.2))] shadow-[0_0_24px_rgba(124,58,237,0.5)] ring-1 ring-[rgba(167,139,250,0.58)]'
                                                : 'bg-transparent',
                                        ].join(' ')}
                                    >
                                        <span className={isActive ? 'drop-shadow-[0_0_12px_rgba(142,107,255,0.65)]' : ''}>
                                            <Icon active={isActive} />
                                        </span>
                                    </span>
                                    <span>{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
}

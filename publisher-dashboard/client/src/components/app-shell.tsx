'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { apiFetch } from '@/lib/api';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: IconHome },
  { href: '/surveys', label: 'Surveys', icon: IconList },
  { href: '/surveys/new', label: 'Create survey', icon: IconPlus },
  { href: '/audience', label: 'Audience', icon: IconUsers },
  { href: '/earnings', label: 'Earnings', icon: IconChart },
  { href: '/analytics', label: 'Analytics', icon: IconAnalytics },
  { href: '/notifications', label: 'Notifications', icon: IconBell },
  { href: '/settings', label: 'Settings', icon: IconGear },
];

type Notif = { _id: string; title: string; body: string; read: boolean; createdAt: string; type?: string };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const unread = notifications.filter((n) => !n.read).length;

  const loadNotifs = useCallback(async () => {
    try {
      const data = await apiFetch<{ notifications: Notif[] }>('/api/notifications');
      setNotifications(data.notifications || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadNotifs();
    const id = setInterval(loadNotifs, 15000);
    return () => clearInterval(id);
  }, [loadNotifs]);

  const markRead = async (id: string) => {
    await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    loadNotifs();
  };

  const markAllRead = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'POST' });
    loadNotifs();
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <aside
        className={`sticky top-0 h-screen shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        <div className="flex h-14 items-center justify-between px-3 border-b border-[var(--border)]">
          {!collapsed && (
            <Link href="/dashboard" className="font-semibold text-primary truncate">
              RM Survey
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 transition-card"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
        <nav className="p-2 space-y-1">
          {nav.map((item) => {
            let active = false;
            if (item.href === '/dashboard') active = pathname === '/dashboard';
            else if (item.href === '/surveys')
              active = pathname === '/surveys' || /^\/surveys\/[^/]+\/edit$/.test(pathname);
            else if (item.href === '/surveys/new') active = pathname.startsWith('/surveys/new');
            else active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-card ${
                  active
                    ? 'bg-primary text-white shadow-card dark:shadow-card-dark'
                    : 'text-[var(--text-secondary)] hover:bg-black/[0.06] dark:hover:bg-white/10 hover:text-[var(--text)]'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0 opacity-90" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 backdrop-blur-md">
          <div className="relative flex-1 max-w-xl">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              <IconSearch className="h-4 w-4" />
            </span>
            <input
              type="search"
              placeholder="Search surveys, responses…"
              className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm outline-none ring-primary/20 focus:ring-2 transition-card"
            />
          </div>
          <button
            type="button"
            onClick={toggle}
            className="rounded-full border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface)] transition-card"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((o) => !o);
                setProfileOpen(false);
              }}
              className="relative rounded-full border border-[var(--border)] p-2 hover:bg-[var(--surface)] transition-card"
              aria-label="Notifications"
            >
              <IconBell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-alert px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-card border border-[var(--border)] bg-[var(--bg)] shadow-card dark:shadow-card-dark z-50">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
                  <span className="text-sm font-semibold">Alerts</span>
                  <button type="button" className="text-xs text-primary" onClick={markAllRead}>
                    Mark all read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="p-4 text-sm text-[var(--text-secondary)]">No notifications yet.</p>
                ) : (
                  <ul className="divide-y divide-[var(--border)]">
                    {notifications.slice(0, 8).map((n) => (
                      <li key={n._id}>
                        <button
                          type="button"
                          onClick={() => !n.read && markRead(n._id)}
                          className={`w-full text-left px-3 py-2 hover:bg-[var(--surface)] transition-card ${
                            !n.read ? 'bg-primary/5' : ''
                          }`}
                        >
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{n.body}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/notifications"
                  className="block border-t border-[var(--border)] px-3 py-2 text-center text-sm text-primary"
                  onClick={() => setNotifOpen(false)}
                >
                  View all
                </Link>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((o) => !o);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 rounded-full border border-[var(--border)] py-1 pl-1 pr-3 hover:bg-[var(--surface)] transition-card"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
              {!user ? null : <span className="hidden sm:inline max-w-[120px] truncate text-sm">{user.name}</span>}
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-card border border-[var(--border)] bg-[var(--bg)] shadow-card z-50 py-1">
                <Link
                  href="/settings"
                  className="block px-3 py-2 text-sm hover:bg-[var(--surface)]"
                  onClick={() => setProfileOpen(false)}
                >
                  Settings
                </Link>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-alert hover:bg-[var(--surface)]"
                  onClick={() => {
                    logout();
                    setProfileOpen(false);
                    window.location.href = '/login';
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

function IconHome(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
    </svg>
  );
}
function IconList(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  );
}
function IconPlus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
function IconUsers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
    </svg>
  );
}
function IconChart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 3v18h18M7 16l4-4 4 4 5-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconAnalytics(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="3" width="7" height="18" rx="1" />
      <rect x="14" y="9" width="7" height="12" rx="1" />
    </svg>
  );
}
function IconBell(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" />
    </svg>
  );
}
function IconGear(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.84 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
function IconSearch(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

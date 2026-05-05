import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { axiosApi } from '@/api/client';

const nav = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/surveys', label: 'Surveys' },
  { to: '/surveys/new', label: 'Create survey' },
  { to: '/audience', label: 'Audience' },
  { to: '/earnings', label: 'Earnings' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/settings', label: 'Settings' },
];

type Notif = { _id: string; title: string; body: string; read: boolean };

export function AppShellLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [panel, setPanel] = useState(false);

  const loadNotifs = useCallback(async () => {
    try {
      const { data } = await axiosApi.get<{ notifications: Notif[] }>('/notifications');
      setNotifs(data.notifications || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadNotifs();
    const id = setInterval(loadNotifs, 15000);
    return () => clearInterval(id);
  }, [loadNotifs]);

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <aside
        className={`sticky top-0 h-screen shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        <div className="flex h-14 items-center justify-between px-3 border-b border-[var(--border)]">
          {!collapsed && (
            <Link to="/dashboard" className="font-semibold text-primary truncate">
              RM Survey
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
        <nav className="p-2 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-card'
                    : 'text-[var(--text-secondary)] hover:bg-black/[0.06] dark:hover:bg-white/10'
                }`
              }
            >
              {!collapsed && <span>{item.label}</span>}
              {collapsed && <span className="mx-auto text-xs">•</span>}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => {
              logout().then(() => navigate('/login'));
            }}
            className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-alert hover:bg-black/[0.06] dark:hover:bg-white/10"
          >
            {!collapsed ? 'Logout' : '×'}
          </button>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 backdrop-blur-md">
          <div className="relative flex-1 max-w-xl">
            <input
              type="search"
              placeholder="Search…"
              className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-2 px-4 text-sm outline-none focus:ring-2 ring-primary/20"
            />
          </div>
          <button
            type="button"
            onClick={toggle}
            className="rounded-full border border-[var(--border)] p-2 text-sm"
            aria-label="theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setPanel((p) => !p)}
              className="relative rounded-full border border-[var(--border)] px-3 py-1.5 text-sm"
            >
              Alerts {unread > 0 ? `(${unread})` : ''}
            </button>
            {panel && (
              <div className="absolute right-0 mt-2 w-80 max-h-80 overflow-auto rounded-[10px] border border-[var(--border)] bg-[var(--bg)] shadow-card z-50 text-sm">
                {notifs.slice(0, 8).map((n) => (
                  <div key={n._id} className="border-b border-[var(--border)] px-3 py-2">
                    <p className="font-medium">{n.title}</p>
                    <p className="text-[var(--text-secondary)]">{n.body}</p>
                  </div>
                ))}
                <Link to="/notifications" className="block py-2 text-center text-primary" onClick={() => setPanel(false)}>
                  View all
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] py-1 px-3 text-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
            <span className="hidden sm:inline max-w-[100px] truncate">{user?.name}</span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

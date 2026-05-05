import { Link } from 'react-router-dom';
import { Card, ScreenTitle } from '../components/ui';

const rows = [
    { to: '/survey/reports', label: 'Reports & analytics', sub: 'Responses · insights', icon: '📊' },
    { to: '/survey/create/basic', label: 'Create survey', sub: 'Publisher workspace', icon: '✦' },
    { to: '/survey/refer', label: 'Refer & earn', sub: '10% commission · share code', icon: '🎁' },
    { to: '/survey/account', label: 'Account & KYC', sub: 'Profile · verification', icon: '👤' },
    { to: '/survey/wallet/add', label: 'Payment methods', sub: 'UPI · Cards · NetBank', icon: '💳' },
];

export default function MoreScreen() {
    return (
        <div className="relative min-h-screen px-4 pb-10 pt-12">
            <ScreenTitle eyebrow="RM Survey" title="More" subtitle="Tools, earnings, and controls." />

            <div className="space-y-2">
                {rows.map((r) => (
                    <Link key={r.to} to={r.to}>
                        <Card variant="elevated" className="flex items-center gap-4 p-4 transition hover:border-[#7C3AED]/35 hover:shadow-[0_0_24px_rgba(124,58,237,0.15)]">
                            <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[rgba(11,15,26,0.9)] text-xl ring-1 ring-white/10">
                                {r.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white">{r.label}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{r.sub}</p>
                            </div>
                            <svg className="h-5 w-5 shrink-0 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Card>
                    </Link>
                ))}
            </div>

            <Card variant="inset" className="mt-8 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Support</p>
                <p className="mt-2 text-sm text-slate-400">help@rmsurvey.app · Priority SLA</p>
            </Card>
        </div>
    );
}

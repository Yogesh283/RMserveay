import { Link } from 'react-router-dom';
import { GlassCard } from '../components/ui';

export default function AccountScreen() {
    return (
        <div className="min-h-screen px-4 pb-8 pt-14">
            <div className="flex flex-col items-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#7C3AED] via-[#3B82F6] to-[#0F172A] text-3xl font-bold text-white shadow-[0_0_48px_rgba(124,58,237,0.45)] ring-4 ring-[#F59E0B]/25">
                    YK
                </div>
                <h1 className="mt-4 text-xl font-bold text-white">Yogesh Kumar</h1>
                <p className="text-sm text-slate-500">yogesh@example.com</p>
            </div>

            <GlassCard className="mt-8 space-y-1 p-2">
                {[
                    { label: 'Profile settings', to: '#' },
                    { label: 'Notifications', to: '#' },
                    { label: 'Billing & invoices', to: '/survey/wallet/add' },
                    { label: 'Help centre', to: '#' },
                ].map((row) => (
                    <Link
                        key={row.label}
                        to={row.to}
                        className="flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
                    >
                        {row.label}
                        <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                ))}
            </GlassCard>

            <p className="mt-10 text-center text-xs text-slate-600">RM Survey · Account</p>
        </div>
    );
}

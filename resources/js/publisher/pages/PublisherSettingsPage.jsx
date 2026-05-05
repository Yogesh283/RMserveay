import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import PubButton from '../components/PubButton';
import PubCard from '../components/PubCard';
import PubInput from '../components/PubInput';
import PubPageHeader from '../components/PubPageHeader';
import PubToggle from '../components/PubToggle';
import { pub } from '../ui/pubTheme';

export default function PublisherSettingsPage() {
    const { user } = useOutletContext();
    const initial = (user?.name || user?.email || '?').trim();
    const monogram = initial.charAt(0).toUpperCase() || '?';

    const [profileName, setProfileName] = useState(user?.name ?? '');
    const [profileEmail, setProfileEmail] = useState(user?.email ?? '');

    const [notifMilestone, setNotifMilestone] = useState(true);
    const [notifEarnings, setNotifEarnings] = useState(true);
    const [notifWeekly, setNotifWeekly] = useState(false);
    const [notifMarketing, setNotifMarketing] = useState(false);

    return (
        <div className="space-y-8">
            <PubPageHeader
                title="Settings"
                subtitle="Profile, security, payouts, and notification control — one premium dark layout."
            />

            <PubCard className="p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-white">Profile</h2>
                <p className={`mt-1 text-sm ${pub.muted}`}>How you appear across RM Survey Publisher.</p>
                <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
                    <div className="flex shrink-0 flex-col items-center gap-3 sm:items-start">
                        <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[#2A3550] bg-[#1A2235] text-2xl font-bold text-white shadow-[0_0_32px_rgba(124,92,255,0.15)]">
                            {monogram}
                        </div>
                        <PubButton variant="secondary" className="!px-4 !py-2 text-xs">
                            Change avatar
                        </PubButton>
                    </div>
                    <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
                        <PubInput label="Display name" placeholder="Your name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                        <PubInput label="Email" type="email" placeholder="you@example.com" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} readOnly />
                        <div className="sm:col-span-2">
                            <label className={pub.label}>Bio</label>
                            <textarea
                                className={`${pub.input} min-h-[88px] resize-y py-3`}
                                placeholder="Short bio for your publisher profile…"
                                rows={3}
                            />
                        </div>
                    </div>
                </div>
            </PubCard>

            <PubCard className="p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-white">Change password</h2>
                <p className={`mt-1 text-sm ${pub.muted}`}>Use a strong password you don’t reuse elsewhere.</p>
                <div className="mt-6 grid max-w-xl gap-4">
                    <PubInput label="Current password" type="password" placeholder="••••••••" autoComplete="current-password" />
                    <PubInput label="New password" type="password" placeholder="••••••••" autoComplete="new-password" />
                    <PubInput label="Confirm new password" type="password" placeholder="••••••••" autoComplete="new-password" />
                    <PubButton className="w-fit">Update password</PubButton>
                </div>
            </PubCard>

            <PubCard className="p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-white">Payment settings</h2>
                <p className={`mt-1 text-sm ${pub.muted}`}>UPI and bank details for withdrawals. Encrypted at rest when backend is connected.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <PubInput label="UPI ID" placeholder="name@bank" />
                    <PubInput label="Account holder name" placeholder="As per bank" />
                    <PubInput label="Bank name" placeholder="e.g. HDFC" />
                    <PubInput label="Account number" placeholder="••••••••" />
                    <div className="sm:col-span-2">
                        <PubInput label="IFSC code" placeholder="HDFC0001234" />
                    </div>
                </div>
                <PubButton className="mt-6">Save payment details</PubButton>
            </PubCard>

            <PubCard className="p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-white">Notification preferences</h2>
                <p className={`mt-1 text-sm ${pub.muted}`}>Choose what we send — purple toggles match the global design system.</p>
                <div className="mt-6 grid gap-3 sm:max-w-xl">
                    <PubToggle
                        checked={notifMilestone}
                        onChange={setNotifMilestone}
                        label="Survey milestones"
                        description="Email when a survey completes a response milestone."
                    />
                    <PubToggle
                        checked={notifEarnings}
                        onChange={setNotifEarnings}
                        label="Earnings & payouts"
                        description="Push and email for new credits and withdrawal status."
                    />
                    <PubToggle
                        checked={notifWeekly}
                        onChange={setNotifWeekly}
                        label="Weekly digest"
                        description="Summary of performance and top surveys."
                    />
                    <PubToggle
                        checked={notifMarketing}
                        onChange={setNotifMarketing}
                        label="Product updates"
                        description="Occasional news about RM Survey features."
                    />
                </div>
                <PubButton className="mt-6">Save preferences</PubButton>
            </PubCard>
        </div>
    );
}

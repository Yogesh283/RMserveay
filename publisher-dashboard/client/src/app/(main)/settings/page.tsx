'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [upi, setUpi] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [emailPref, setEmailPref] = useState(true);
  const [pushPref, setPushPref] = useState(true);
  const [earningsPref, setEarningsPref] = useState(true);
  const [surveyPref, setSurveyPref] = useState(true);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{
          user: {
            name: string;
            company?: string;
            paymentDetails?: { upi?: string; bankName?: string; accountNumber?: string; ifsc?: string };
            notificationPrefs?: { email?: boolean; push?: boolean; earnings?: boolean; surveyComplete?: boolean };
          };
        }>('/api/auth/me');
        const u = data.user;
        setName(u.name);
        setCompany(u.company ?? '');
        setUpi(u.paymentDetails?.upi ?? '');
        setBankName(u.paymentDetails?.bankName ?? '');
        setAccountNumber(u.paymentDetails?.accountNumber ?? '');
        setIfsc(u.paymentDetails?.ifsc ?? '');
        const np = u.notificationPrefs;
        if (np) {
          setEmailPref(np.email ?? true);
          setPushPref(np.push ?? true);
          setEarningsPref(np.earnings ?? true);
          setSurveyPref(np.surveyComplete ?? true);
        }
      } catch {
        /* use auth user fallback */
        if (user) {
          setName(user.name);
          setCompany(user.company ?? '');
        }
      }
    })();
  }, [user]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          company,
          paymentDetails: { upi, bankName, accountNumber, ifsc },
          notificationPrefs: {
            email: emailPref,
            push: pushPref,
            earnings: earningsPref,
            surveyComplete: surveyPref,
          },
        }),
      });
      setProfileMsg('Saved.');
      refresh();
    } catch (err) {
      setProfileErr(err instanceof ApiError ? err.message : 'Save failed');
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwdMsg('');
    setPwdErr('');
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
      });
      setPwdMsg('Password updated.');
      setCurPwd('');
      setNewPwd('');
    } catch (err) {
      setPwdErr(err instanceof ApiError ? err.message : 'Failed');
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)]">Profile, security, and payouts</p>
      </div>

      <form
        onSubmit={saveProfile}
        className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-6 shadow-card space-y-4"
      >
        <h2 className="text-lg font-semibold">Profile & notifications</h2>
        {profileMsg ? <p className="text-sm text-earnings">{profileMsg}</p> : null}
        {profileErr ? <p className="text-sm text-alert">{profileErr}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Company</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="border-t border-[var(--border)] pt-4">
          <h3 className="text-sm font-semibold mb-3">Notification preferences</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={emailPref} onChange={(e) => setEmailPref(e.target.checked)} className="accent-primary" />
              Email updates
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={pushPref} onChange={(e) => setPushPref(e.target.checked)} className="accent-primary" />
              Push (in-app)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={earningsPref} onChange={(e) => setEarningsPref(e.target.checked)} className="accent-primary" />
              Earnings alerts
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={surveyPref} onChange={(e) => setSurveyPref(e.target.checked)} className="accent-primary" />
              Survey completed
            </label>
          </div>
        </div>
        <div className="border-t border-[var(--border)] pt-4">
          <h3 className="text-sm font-semibold mb-3">Payment details</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs text-[var(--text-secondary)]">UPI ID</label>
              <input
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Bank name</label>
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Account number</label>
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-[var(--text-secondary)]">IFSC</label>
              <input
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
          Save changes
        </button>
      </form>

      <form
        onSubmit={changePassword}
        className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-6 shadow-card space-y-4"
      >
        <h2 className="text-lg font-semibold">Change password</h2>
        {pwdMsg ? <p className="text-sm text-earnings">{pwdMsg}</p> : null}
        {pwdErr ? <p className="text-sm text-alert">{pwdErr}</p> : null}
        <div>
          <label className="text-sm font-medium">Current password</label>
          <input
            type="password"
            value={curPwd}
            onChange={(e) => setCurPwd(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">New password</label>
          <input
            type="password"
            minLength={6}
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium">
          Update password
        </button>
      </form>
    </div>
  );
}

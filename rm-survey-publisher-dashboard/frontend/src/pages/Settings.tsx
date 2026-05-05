import { type FormEvent, useEffect, useState } from 'react';
import { axiosApi } from '@/api/client';
import { ApiError } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

export default function Settings() {
  const { refresh } = useAuth();
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
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  useEffect(() => {
    axiosApi.get('/auth/me').then(({ data }) => {
      const u = data.user;
      setName(u.name);
      setCompany(u.company ?? '');
      const pd = u.paymentDetails ?? {};
      setUpi(pd.upi ?? '');
      setBankName(pd.bankName ?? '');
      setAccountNumber(pd.accountNumber ?? '');
      setIfsc(pd.ifsc ?? '');
      const np = u.notificationPrefs ?? {};
      setEmailPref(np.email ?? true);
      setPushPref(np.push ?? true);
      setEarningsPref(np.earnings ?? true);
      setSurveyPref(np.surveyComplete ?? true);
    });
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileMsg('');
    try {
      await axiosApi.patch('/auth/profile', {
        name,
        company,
        paymentDetails: { upi, bankName, accountNumber, ifsc },
        notificationPrefs: {
          email: emailPref,
          push: pushPref,
          earnings: earningsPref,
          surveyComplete: surveyPref,
        },
      });
      setProfileMsg('Saved.');
      refresh();
    } catch (err) {
      setProfileMsg(err instanceof ApiError ? err.message : 'Error');
    }
  }

  async function savePwd(e: FormEvent) {
    e.preventDefault();
    setPwdMsg('');
    try {
      await axiosApi.post('/auth/change-password', { currentPassword: curPwd, newPassword: newPwd });
      setPwdMsg('Password updated.');
      setCurPwd('');
      setNewPwd('');
    } catch (err) {
      setPwdMsg(err instanceof ApiError ? err.message : 'Failed');
    }
  }

  return (
    <div className="space-y-8 max-w-xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <form onSubmit={saveProfile} className="space-y-4 rounded-[10px] border border-[var(--border)] p-6">
        <h2 className="font-semibold">Profile & prefs</h2>
        {profileMsg && <p className="text-sm">{profileMsg}</p>}
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" placeholder="Name" />
        <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" placeholder="Company" />
        <div className="grid gap-2">
          <label className="text-xs">UPI</label>
          <input value={upi} onChange={(e) => setUpi(e.target.value)} className="rounded border px-3 py-2 text-sm" />
          <label className="text-xs">Bank / Account / IFSC</label>
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="rounded border px-3 py-2 text-sm" placeholder="Bank" />
          <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="rounded border px-3 py-2 text-sm" placeholder="Account" />
          <input value={ifsc} onChange={(e) => setIfsc(e.target.value)} className="rounded border px-3 py-2 text-sm" placeholder="IFSC" />
        </div>
        <div className="space-y-2 text-sm">
          <label className="flex gap-2">
            <input type="checkbox" checked={emailPref} onChange={(e) => setEmailPref(e.target.checked)} /> Email
          </label>
          <label className="flex gap-2">
            <input type="checkbox" checked={pushPref} onChange={(e) => setPushPref(e.target.checked)} /> Push
          </label>
          <label className="flex gap-2">
            <input type="checkbox" checked={earningsPref} onChange={(e) => setEarningsPref(e.target.checked)} /> Earnings
          </label>
          <label className="flex gap-2">
            <input type="checkbox" checked={surveyPref} onChange={(e) => setSurveyPref(e.target.checked)} /> Survey complete
          </label>
        </div>
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm text-white">
          Save
        </button>
      </form>

      <form onSubmit={savePwd} className="space-y-4 rounded-[10px] border border-[var(--border)] p-6">
        <h2 className="font-semibold">Password</h2>
        {pwdMsg && <p className="text-sm">{pwdMsg}</p>}
        <input type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" placeholder="Current" />
        <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" placeholder="New (min 6)" />
        <button type="submit" className="rounded-lg border px-4 py-2 text-sm">
          Update password
        </button>
      </form>
    </div>
  );
}

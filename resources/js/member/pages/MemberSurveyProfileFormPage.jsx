import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { prepareSanctum } from '../../lib/auth';
import { RmsButton, RmsCard } from '../components/rms';
import { isSurveyProfileComplete, REQUIRED_SURVEY_PROFILE_FIELDS } from '../lib/surveyProfileGate';

const labelCls = 'block text-[10px] font-semibold uppercase tracking-wide text-white';
const inputCls =
    'mt-1 w-full rounded-lg border border-white/[0.1] bg-[#0b1020] px-2.5 py-1.5 text-[13px] text-white placeholder:text-white/60 focus:border-[#8E6BFF]/40 focus:outline-none focus:ring-1 focus:ring-[#8E6BFF]/30 [&>option]:bg-[#0b1020] [&>option]:text-white';

const interestOptions = ['technology', 'gaming', 'shopping', 'finance', 'crypto', 'sports', 'movies', 'travel'];

const emptyForm = {
    full_name: '',
    gender: '',
    age: '',
    country: '',
    state: '',
    city: '',
    mobile_number: '',
    email_id: '',
    education_level: '',
    occupation: '',
    monthly_income_range: '',
    device_type: '',
    internet_usage: '',
    interests: [],
    instagram_user: false,
    youtube_user: false,
    telegram_user: false,
    preferred_survey_language: '',
    preferred_survey_category: '',
    marital_status: '',
    vehicle_owner: '',
    online_shopping_user: false,
};

export default function MemberSurveyProfileFormPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const fromPath = searchParams.get('from') || '';
    const isGate = Boolean(fromPath);
    const [user, setUser] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await prepareSanctum();
                const { data } = await window.axios.get('api/user');
                if (cancelled || !data?.user) return;
                setUser(data.user);
                const p = data.user.survey_profile ?? {};
                setForm({
                    ...emptyForm,
                    ...p,
                    age: p?.age ?? '',
                    interests: Array.isArray(p?.interests) ? p.interests : [],
                    instagram_user: Boolean(p?.instagram_user),
                    youtube_user: Boolean(p?.youtube_user),
                    telegram_user: Boolean(p?.telegram_user),
                    online_shopping_user: Boolean(p?.online_shopping_user),
                });
            } catch {
                if (!cancelled) {
                    setErr('Could not load profile form.');
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const canSave = useMemo(() => user !== null && !saving, [user, saving]);

    function setField(key, value) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function toggleInterest(value) {
        setForm((prev) => ({
            ...prev,
            interests: prev.interests.includes(value) ? prev.interests.filter((x) => x !== value) : [...prev.interests, value],
        }));
    }

    const missingRequired = useMemo(() => {
        const out = [];
        for (const k of REQUIRED_SURVEY_PROFILE_FIELDS) {
            const v = form?.[k];
            const has = v != null && (typeof v === 'string' ? v.trim().length > 0 : Boolean(v));
            if (!has) out.push(k);
        }
        return out;
    }, [form]);

    async function onSubmit(e) {
        e.preventDefault();
        if (!user) return;
        if (isGate && missingRequired.length > 0) {
            setErr('Please fill all required fields before continuing to surveys.');
            return;
        }
        setSaving(true);
        setErr('');
        setMsg('');
        setFieldErrors({});
        try {
            await prepareSanctum();
            const payload = {
                ...form,
                age: form.age === '' || form.age === null ? null : Number(form.age),
                email_id: typeof form.email_id === 'string' ? form.email_id.trim().toLowerCase() : form.email_id,
                full_name: typeof form.full_name === 'string' ? form.full_name.trim() : form.full_name,
                country: typeof form.country === 'string' ? form.country.trim() : form.country,
                state: typeof form.state === 'string' ? form.state.trim() : form.state,
                city: typeof form.city === 'string' ? form.city.trim() : form.city,
                mobile_number: typeof form.mobile_number === 'string' ? form.mobile_number.trim() : form.mobile_number,
            };
            await window.axios.patch('api/user', {
                name: user.name ?? '',
                email: user.email ?? '',
                phone: user.phone ?? null,
                profile: user.profile ?? null,
                survey_profile: payload,
            });
            setMsg('Survey profile saved.');
            setForm((prev) => ({ ...prev, ...payload }));
            if (isGate && isSurveyProfileComplete(payload)) {
                navigate(fromPath || '/member/surveys', { replace: true });
                return;
            }
            window.setTimeout(() => setMsg(''), 2500);
        } catch (e2) {
            if (e2.response?.data?.errors) {
                setFieldErrors(e2.response.data.errors);
            }
            setErr(e2.response?.data?.message ?? e2.message ?? 'Could not save form.');
        } finally {
            setSaving(false);
        }
    }

    function errorFor(key) {
        const k = `survey_profile.${key}`;
        const list = fieldErrors[k] ?? fieldErrors[key];
        if (!list) return null;
        return Array.isArray(list) ? list[0] : String(list);
    }

    return (
        <div className="mx-auto max-w-3xl space-y-2.5">
            <header className="rounded-2xl border border-violet-300/15 bg-[#0b1020]/60 px-3 py-2.5 backdrop-blur-xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C4B5FD]">RM Survey</p>
                <h1 className="mt-1 text-xl font-bold text-white">Short User Profile Form</h1>
                <p className="mt-1 text-xs text-white">Fill this once to improve survey targeting and rewards relevance.</p>
            </header>

            {isGate ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-amber-100">
                    <p className="text-xs font-semibold">Profile required before surveys</p>
                    {missingRequired.length > 0 ? (
                        <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                            {missingRequired.length} pending
                        </span>
                    ) : null}
                </div>
            ) : null}

            {err ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</p> : null}
            {msg ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{msg}</p> : null}

            <form onSubmit={onSubmit} className="space-y-2.5">
                <RmsCard variant="elevated" className="!rounded-[18px] !border-violet-300/20 !bg-[#0b1020]/75 !p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#C4B5FD]">1. Basic Information</p>
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                        <Field label="Full Name" error={errorFor('full_name')}><input className={inputCls} value={form.full_name ?? ''} onChange={(e) => setField('full_name', e.target.value)} /></Field>
                        <Field label="Gender" error={errorFor('gender')}>
                            <select className={inputCls} value={form.gender ?? ''} onChange={(e) => setField('gender', e.target.value)}>
                                <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                            </select>
                        </Field>
                        <Field label="Age (10-99)" error={errorFor('age')}><input type="number" min={10} max={99} className={inputCls} value={form.age ?? ''} onChange={(e) => setField('age', e.target.value)} /></Field>
                        <Field label="Country" error={errorFor('country')}><input className={inputCls} value={form.country ?? ''} onChange={(e) => setField('country', e.target.value)} /></Field>
                        <Field label="State" error={errorFor('state')}><input className={inputCls} value={form.state ?? ''} onChange={(e) => setField('state', e.target.value)} /></Field>
                        <Field label="City" error={errorFor('city')}><input className={inputCls} value={form.city ?? ''} onChange={(e) => setField('city', e.target.value)} /></Field>
                    </div>
                </RmsCard>

                <RmsCard variant="elevated" className="!rounded-[18px] !border-violet-300/20 !bg-[#0b1020]/75 !p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#C4B5FD]">2. Contact Information</p>
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                        <Field label="Mobile Number" error={errorFor('mobile_number')}><input className={inputCls} value={form.mobile_number ?? ''} onChange={(e) => setField('mobile_number', e.target.value)} /></Field>
                        <Field label="Email ID" error={errorFor('email_id')}><input type="email" className={inputCls} value={form.email_id ?? ''} onChange={(e) => setField('email_id', e.target.value)} /></Field>
                    </div>
                </RmsCard>

                <RmsCard variant="elevated" className="!rounded-[18px] !border-violet-300/20 !bg-[#0b1020]/75 !p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#C4B5FD]">3-5. Education, Work, Device</p>
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                        <Field label="Education Level" error={errorFor('education_level')}><select className={inputCls} value={form.education_level ?? ''} onChange={(e) => setField('education_level', e.target.value)}><option value="">Select</option><option value="10th">10th</option><option value="12th">12th</option><option value="graduate">Graduate</option><option value="post_graduate">Post Graduate</option></select></Field>
                        <Field label="Occupation" error={errorFor('occupation')}><select className={inputCls} value={form.occupation ?? ''} onChange={(e) => setField('occupation', e.target.value)}><option value="">Select</option><option value="student">Student</option><option value="job">Job</option><option value="business">Business</option><option value="freelancer">Freelancer</option><option value="unemployed">Unemployed</option></select></Field>
                        <Field label="Monthly Income Range" error={errorFor('monthly_income_range')}><select className={inputCls} value={form.monthly_income_range ?? ''} onChange={(e) => setField('monthly_income_range', e.target.value)}><option value="">Select</option><option value="10k_25k">₹10k–25k</option><option value="25k_50k">₹25k–50k</option><option value="50k_plus">₹50k+</option></select></Field>
                        <Field label="Device" error={errorFor('device_type')}><select className={inputCls} value={form.device_type ?? ''} onChange={(e) => setField('device_type', e.target.value)}><option value="">Select</option><option value="android">Android</option><option value="iphone">iPhone</option></select></Field>
                        <Field label="Internet Usage" error={errorFor('internet_usage')}><select className={inputCls} value={form.internet_usage ?? ''} onChange={(e) => setField('internet_usage', e.target.value)}><option value="">Select</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
                    </div>
                </RmsCard>

                <RmsCard variant="elevated" className="!rounded-[18px] !border-violet-300/20 !bg-[#0b1020]/75 !p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#C4B5FD]">6-8. Interests, Social, Preferences</p>
                    <div className="mt-2.5">
                        <p className={labelCls}>Interests (Multi Select)</p>
                        <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                            {interestOptions.map((x) => (
                                <button key={x} type="button" onClick={() => toggleInterest(x)} className={`rounded-lg border px-2 py-1 text-[11px] ${form.interests.includes(x) ? 'border-violet-300/55 bg-violet-500/20 text-violet-100' : 'border-white/10 bg-white/[0.04] text-white'}`}>
                                    {x}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                        <YesNo label="Instagram User?" checked={form.instagram_user} onChange={(v) => setField('instagram_user', v)} />
                        <YesNo label="YouTube User?" checked={form.youtube_user} onChange={(v) => setField('youtube_user', v)} />
                        <YesNo label="Telegram User?" checked={form.telegram_user} onChange={(v) => setField('telegram_user', v)} />
                        <Field label="Preferred Survey Language" error={errorFor('preferred_survey_language')}><input className={inputCls} value={form.preferred_survey_language ?? ''} onChange={(e) => setField('preferred_survey_language', e.target.value)} /></Field>
                        <Field label="Preferred Survey Category" error={errorFor('preferred_survey_category')}><input className={inputCls} value={form.preferred_survey_category ?? ''} onChange={(e) => setField('preferred_survey_category', e.target.value)} /></Field>
                    </div>
                </RmsCard>

                <RmsCard variant="elevated" className="!rounded-[18px] !border-violet-300/20 !bg-[#0b1020]/75 !p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#C4B5FD]">Optional</p>
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                        <Field label="Married / Unmarried" error={errorFor('marital_status')}><select className={inputCls} value={form.marital_status ?? ''} onChange={(e) => setField('marital_status', e.target.value)}><option value="">Select</option><option value="married">Married</option><option value="unmarried">Unmarried</option></select></Field>
                        <Field label="Car/Bike Owner" error={errorFor('vehicle_owner')}><select className={inputCls} value={form.vehicle_owner ?? ''} onChange={(e) => setField('vehicle_owner', e.target.value)}><option value="">Select</option><option value="none">No</option><option value="bike">Bike</option><option value="car">Car</option><option value="both">Both</option></select></Field>
                        <YesNo label="Online Shopping User?" checked={form.online_shopping_user} onChange={(v) => setField('online_shopping_user', v)} />
                    </div>
                    {Object.keys(fieldErrors).length ? (
                        <div className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-[11px] text-red-200">
                            <p className="mb-1 font-semibold">Please fix the following:</p>
                            <ul className="list-disc pl-4">
                                {Object.entries(fieldErrors).map(([k, v]) => (
                                    <li key={k}>
                                        <span className="font-mono">{k.replace(/^survey_profile\./, '')}</span>: {Array.isArray(v) ? v[0] : String(v)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </RmsCard>

                <div className="flex flex-wrap items-center gap-1.5">
                    <RmsButton type="submit" variant="neon" disabled={!canSave || (isGate && missingRequired.length > 0)}>
                        {saving ? 'Saving…' : isGate ? 'Save & continue to surveys' : 'Save form'}
                    </RmsButton>
                    <Link
                        to={isGate ? (fromPath || '/member') : '/member/profile'}
                        className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white hover:text-white"
                    >
                        {isGate ? 'Cancel' : 'Back to profile'}
                    </Link>
                </div>
            </form>
        </div>
    );
}

function Field({ label, children, error }) {
    return (
        <label className="block">
            <span className={labelCls}>{label}</span>
            {children}
            {error ? <span className="mt-1 block text-[10px] font-medium text-red-300">{error}</span> : null}
        </label>
    );
}

function YesNo({ label, checked, onChange }) {
    return (
        <div>
            <p className={labelCls}>{label}</p>
            <div className="mt-1 flex gap-1.5">
                <button type="button" onClick={() => onChange(true)} className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${checked ? 'border-emerald-300/60 bg-emerald-500/20 text-emerald-200' : 'border-white/10 bg-white/[0.04] text-white'}`}>Yes</button>
                <button type="button" onClick={() => onChange(false)} className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${!checked ? 'border-amber-300/60 bg-amber-500/20 text-amber-200' : 'border-white/10 bg-white/[0.04] text-white'}`}>No</button>
            </div>
        </div>
    );
}

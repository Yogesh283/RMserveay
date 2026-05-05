import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PubButton from '../components/PubButton';
import PubCard from '../components/PubCard';
import PubInput from '../components/PubInput';
import PubPageHeader from '../components/PubPageHeader';
import PubSelect from '../components/PubSelect';
import { publisherPost } from '../lib/publisherApi';
import { pub } from '../ui/pubTheme';

const steps = [
    { id: 1, title: 'Basics', desc: 'Title & description' },
    { id: 2, title: 'Questions', desc: 'Builder & logic' },
    { id: 3, title: 'Audience', desc: 'Targeting' },
    { id: 4, title: 'Review', desc: 'Publish' },
];

const types = ['Multiple choice', 'Text input', 'Rating (stars)', 'Yes / No', 'Dropdown'];

function uiLabelToApiType(label) {
    const m = {
        'Multiple choice': 'multiple_choice',
        'Text input': 'text',
        'Rating (stars)': 'rating',
        'Yes / No': 'yes_no',
        Dropdown: 'dropdown',
    };
    return m[label] || 'text';
}

export default function PublisherCreateSurveyPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Brand');
    const [questions, setQuestions] = useState([]);
    const [region, setRegion] = useState('India — all');
    const [ageBand, setAgeBand] = useState('18–44');
    const [segmentNote, setSegmentNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveErr, setSaveErr] = useState(null);

    function addQuestion(uiLabel) {
        const apiType = uiLabelToApiType(uiLabel);
        const key = `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const base = {
            key,
            type: apiType,
            label: `${uiLabel} · Q${questions.length + 1}`,
            required: false,
            options: [],
        };
        if (apiType === 'multiple_choice' || apiType === 'dropdown') {
            base.options = ['Option A', 'Option B'];
        }
        if (apiType === 'rating') {
            base.minRating = 1;
            base.maxRating = 5;
        }
        setQuestions((q) => [...q, base]);
    }

    function removeQuestion(key) {
        setQuestions((q) => q.filter((x) => x.key !== key));
    }

    const targetAudience =
        region || ageBand || segmentNote
            ? { region, ageBand, note: segmentNote || null, category }
            : { category };

    async function publish() {
        setSaveErr(null);
        setSaving(true);
        const payload = {
            title: title.trim() || 'Untitled survey',
            description: description.trim() || null,
            status: 'active',
            target_audience: targetAudience,
            questions:
                questions.length > 0
                    ? questions
                    : [{ key: 'q_default', type: 'text', label: 'Your feedback', required: false }],
        };
        try {
            await publisherPost('publisher/surveys', payload);
            navigate('/publisher/surveys');
        } catch (e) {
            const msg = e.response?.data?.message;
            const errs = e.response?.data?.errors;
            setSaveErr(
                msg ||
                    (errs ? JSON.stringify(errs) : null) ||
                    e.message ||
                    'Could not save survey — check questions (e.g. choice types need options).',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-8">
            <PubPageHeader
                title="Create survey"
                subtitle="Multi-step flow — publishes to the database as an active survey."
            />

            {saveErr ? (
                <PubCard className="border-red-500/30 p-4">
                    <p className="text-sm text-red-400">{saveErr}</p>
                </PubCard>
            ) : null}

            <PubCard className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {steps.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setStep(s.id)}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition duration-200 sm:text-sm ${
                                    step === s.id
                                        ? 'border-[#7C5CFF] bg-gradient-to-r from-[#6C4CF1]/25 to-[#8E6BFF]/20 text-white shadow-[0_0_20px_rgba(124,92,255,0.2)]'
                                        : 'border-[#2A3550] bg-[#1A2235] text-[#9CA3AF] hover:border-[#7C5CFF]/40 hover:text-white'
                                }`}
                            >
                                <span
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] ${
                                        step === s.id
                                            ? 'bg-gradient-to-r from-[#6C4CF1] to-[#8E6BFF] text-white'
                                            : 'bg-[#111827] text-[#9CA3AF]'
                                    }`}
                                >
                                    {s.id}
                                </span>
                                <span>
                                    <span className="block">{s.title}</span>
                                    <span className="font-normal text-[#9CA3AF]">{s.desc}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                    <p className={`text-xs ${pub.muted}`}>
                        Step {step} of {steps.length}
                    </p>
                </div>
            </PubCard>

            {step === 1 ? (
                <PubCard className="p-6">
                    <h2 className="text-lg font-semibold text-white">Survey basics</h2>
                    <p className={`mt-1 text-sm ${pub.muted}`}>Internal name and how respondents see the study.</p>
                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <PubInput label="Survey title" placeholder="e.g. Q2 Brand pulse" value={title} onChange={(e) => setTitle(e.target.value)} />
                        <PubSelect label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                            <option>Brand</option>
                            <option>Product</option>
                            <option>Market</option>
                        </PubSelect>
                        <div className="sm:col-span-2">
                            <label className={pub.label}>Description</label>
                            <textarea
                                className={`${pub.input} min-h-[100px] resize-y py-3`}
                                placeholder="Short intro shown before the first question…"
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <PubButton onClick={() => setStep(2)}>Continue</PubButton>
                    </div>
                </PubCard>
            ) : null}

            {step === 2 ? (
                <div className="grid gap-6 lg:grid-cols-3">
                    <PubCard className="space-y-4 p-6 lg:col-span-2">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Question builder</h2>
                            <p className={`mt-1 text-sm ${pub.muted}`}>Add at least one block (or we add a default text question on publish).</p>
                        </div>
                        <div className={`min-h-[120px] rounded-xl border border-[#2A3550] bg-[#0B0F1A]/50 p-3`}>
                            {questions.length === 0 ? (
                                <p className={`py-8 text-center text-sm ${pub.muted}`}>Use buttons below to add questions.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {questions.map((q) => (
                                        <li
                                            key={q.key}
                                            className="flex items-center justify-between gap-2 rounded-lg border border-[#2A3550] bg-[#1A2235] px-3 py-2 text-sm text-white/90"
                                        >
                                            <span>
                                                <span className="text-[#9CA3AF]">{q.type}</span> · {q.label}
                                            </span>
                                            <button type="button" className="text-red-400 hover:text-red-300" onClick={() => removeQuestion(q.key)}>
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {types.map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => addQuestion(t)}
                                    className="rounded-xl border border-[#2A3550] bg-[#1A2235] px-3 py-2 text-xs font-medium text-[#9CA3AF] transition duration-200 hover:border-[#7C5CFF]/45 hover:text-white"
                                >
                                    + {t}
                                </button>
                            ))}
                        </div>
                        <PubCard className="border-amber-500/25 bg-amber-500/[0.06] p-4">
                            <p className="text-sm font-medium text-amber-200/90">Conditional logic</p>
                            <p className="mt-1 text-xs text-amber-200/70">Branching rules can be added in a future update.</p>
                        </PubCard>
                        <div className="flex flex-wrap gap-3">
                            <PubButton variant="secondary" onClick={() => setStep(1)}>
                                Back
                            </PubButton>
                            <PubButton variant="secondary" type="button">
                                Save draft
                            </PubButton>
                            <PubButton onClick={() => setStep(3)}>Continue</PubButton>
                        </div>
                    </PubCard>
                    <PubCard className="h-fit p-5">
                        <p className="text-sm font-semibold text-white">Tips</p>
                        <p className={`mt-2 text-xs leading-relaxed ${pub.muted}`}>
                            Multiple choice and dropdown need options. Data is validated on the server before save.
                        </p>
                    </PubCard>
                </div>
            ) : null}

            {step === 3 ? (
                <PubCard className="p-6">
                    <h2 className="text-lg font-semibold text-white">Audience</h2>
                    <p className={`mt-1 text-sm ${pub.muted}`}>Stored as JSON on the survey for future targeting.</p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <PubSelect label="Region" value={region} onChange={(e) => setRegion(e.target.value)}>
                            <option>India — all</option>
                            <option>Metro tier 1</option>
                        </PubSelect>
                        <PubSelect label="Age band" value={ageBand} onChange={(e) => setAgeBand(e.target.value)}>
                            <option>18–44</option>
                            <option>25–34</option>
                        </PubSelect>
                        <div className="sm:col-span-2">
                            <PubInput label="Segment note (optional)" placeholder="Urban professionals" value={segmentNote} onChange={(e) => setSegmentNote(e.target.value)} />
                        </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <PubButton variant="secondary" onClick={() => setStep(2)}>
                            Back
                        </PubButton>
                        <PubButton onClick={() => setStep(4)}>Continue</PubButton>
                    </div>
                </PubCard>
            ) : null}

            {step === 4 ? (
                <PubCard className="p-6">
                    <h2 className="text-lg font-semibold text-white">Review & publish</h2>
                    <p className={`mt-1 text-sm ${pub.muted}`}>Creates an active survey in the database.</p>
                    <div className={`mt-6 space-y-3 rounded-xl border border-[#2A3550] bg-[#1A2235] p-4 text-sm`}>
                        <div className="flex justify-between gap-4 border-b border-[#2A3550] pb-3">
                            <span className={pub.muted}>Title</span>
                            <span className="text-right text-white">{title.trim() || 'Untitled survey'}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-[#2A3550] pb-3">
                            <span className={pub.muted}>Questions</span>
                            <span className="text-white">{questions.length || 1} (incl. default if empty)</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className={pub.muted}>Audience</span>
                            <span className="text-right text-white">
                                {region} · {ageBand}
                            </span>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <PubButton variant="secondary" onClick={() => setStep(3)} disabled={saving}>
                            Back
                        </PubButton>
                        <PubButton onClick={publish} disabled={saving}>
                            {saving ? 'Publishing…' : 'Publish survey'}
                        </PubButton>
                    </div>
                </PubCard>
            ) : null}
        </div>
    );
}

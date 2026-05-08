import PubButton from '../components/PubButton';
import PubCard from '../components/PubCard';
import PubPageFrame from '../components/PubPageFrame';
import PubPageHeader from '../components/PubPageHeader';
import { pub } from '../ui/pubTheme';

const questionTypes = ['Multiple choice', 'Text input', 'Rating (stars)', 'Yes / No', 'Dropdown'];

export default function PublisherCreatePage() {
    return (
        <PubPageFrame>
            <PubPageHeader title="Create survey" subtitle="Builder layout aligned with publisher premium dark theme." />

            <div className="grid gap-6 lg:grid-cols-3">
                <PubCard className="p-5 lg:col-span-1">
                    <p className="text-sm font-semibold text-white">Question types</p>
                    <ul className="mt-3 space-y-2">
                        {questionTypes.map((q) => (
                            <li key={q} className="cursor-grab rounded-lg border border-[#2A3550] bg-[#1A2235] px-3 py-2.5 text-sm text-white/90 transition hover:border-[#7C5CFF]/45">
                                {q}
                            </li>
                        ))}
                    </ul>
                    <p className={`mt-4 text-xs ${pub.muted}`}>Drag questions into canvas.</p>
                </PubCard>

                <PubCard className="min-h-[360px] border-dashed p-6 lg:col-span-2">
                    <p className={`text-center text-sm ${pub.muted}`}>Drop blocks here to build your survey</p>
                    <div className="mt-8 flex justify-center">
                        <PubButton variant="secondary">Preview</PubButton>
                    </div>
                </PubCard>
            </div>

            <PubCard className="p-5">
                <p className="text-sm font-semibold text-white">Conditional logic</p>
                <p className={`mt-1 text-sm ${pub.muted}`}>If answer is X then show block Y.</p>
                <PubButton variant="secondary" className="mt-4">
                    + Add rule
                </PubButton>
            </PubCard>
        </PubPageFrame>
    );
}

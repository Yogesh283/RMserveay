const primary = '#1877F2';

const questionTypes = [
    { id: 'mcq', label: 'Multiple choice' },
    { id: 'text', label: 'Text input' },
    { id: 'rating', label: 'Rating (stars)' },
    { id: 'yn', label: 'Yes / No' },
    { id: 'dropdown', label: 'Dropdown' },
];

export default function PublisherCreatePage({ dark }) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Create survey</h1>
                <p className={`mt-1 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Drag blocks to build your flow — preview before publish
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className={`rounded-xl border p-4 ${dark ? 'border-white/10 bg-[#242526]' : 'border-gray-200 bg-white'} lg:col-span-1`}>
                    <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Question types</p>
                    <ul className="mt-3 space-y-2">
                        {questionTypes.map((q) => (
                            <li
                                key={q.id}
                                className={`cursor-grab rounded-lg border px-3 py-2.5 text-sm transition hover:shadow-sm ${
                                    dark ? 'border-white/10 bg-[#3A3B3C] text-gray-200' : 'border-gray-200 bg-gray-50'
                                }`}
                            >
                                {q.label}
                            </li>
                        ))}
                    </ul>
                    <div className={`mt-6 rounded-lg border border-dashed p-4 text-center text-xs ${dark ? 'border-white/20 text-gray-500' : 'border-gray-300 text-gray-500'}`}>
                        Drag questions into the canvas →
                    </div>
                </div>

                <div
                    className={`min-h-[420px] rounded-xl border-2 border-dashed p-6 lg:col-span-2 ${
                        dark ? 'border-white/15 bg-[#18191A]/50' : 'border-gray-300 bg-gray-50/50'
                    }`}
                >
                    <p className={`text-center text-sm ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Drop blocks here to build your survey
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-2">
                        <button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-medium" style={{ borderColor: primary, color: primary }}>
                            Preview
                        </button>
                    </div>
                </div>
            </div>

            <div className={`rounded-xl border p-5 ${dark ? 'border-white/10 bg-[#242526]' : 'border-gray-200 bg-white'}`}>
                <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Conditional logic</p>
                <p className={`mt-1 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                    If answer is X → show block Y. Configure branching after adding questions.
                </p>
                <button type="button" className="mt-4 rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: primary, color: primary }}>
                    + Add rule
                </button>
            </div>

            <div className="flex flex-wrap gap-3">
                <button type="button" className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: primary }}>
                    Save draft
                </button>
                <button
                    type="button"
                    className={`rounded-lg border px-6 py-2.5 text-sm font-semibold ${dark ? 'border-white/20 text-white' : 'border-gray-300 text-gray-800'}`}
                >
                    Publish
                </button>
            </div>
        </div>
    );
}

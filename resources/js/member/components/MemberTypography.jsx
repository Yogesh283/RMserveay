/** Shared body text styles for member income pages (no typography plugin required). */
export function MemberHeading({ dark, children }) {
    return <h2 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{children}</h2>;
}

export function MemberSubheading({ dark, children }) {
    return <h3 className={`mt-6 text-lg font-semibold ${dark ? 'text-emerald-400' : 'text-emerald-700'}`}>{children}</h3>;
}

export function MemberP({ dark, children }) {
    return <p className={`mt-3 text-sm leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{children}</p>;
}

export function MemberUl({ dark, items }) {
    return (
        <ul className={`mt-3 list-disc space-y-2 pl-5 text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
            {items.map((t) => (
                <li key={t}>{t}</li>
            ))}
        </ul>
    );
}

export function MemberTable({ dark, headers, rows }) {
    return (
        <div className="mt-4 overflow-x-auto">
            <table className={`w-full text-left text-sm ${dark ? 'text-gray-300' : 'text-gray-800'}`}>
                <thead>
                    <tr className={dark ? 'border-b border-white/10 bg-white/5' : 'border-b border-gray-200 bg-gray-50'}>
                        {headers.map((h) => (
                            <th key={h} className="px-3 py-2 font-semibold">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className={dark ? 'border-b border-white/5' : 'border-b border-gray-100'}>
                            {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 align-top">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function MemberNote({ dark, children }) {
    return (
        <div
            className={`mt-6 rounded-lg border p-4 text-sm ${
                dark ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-950'
            }`}
        >
            {children}
        </div>
    );
}

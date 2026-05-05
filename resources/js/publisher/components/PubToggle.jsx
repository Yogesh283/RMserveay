/**
 * Purple active toggle — matches publisher design system.
 *
 * @param {object} props
 * @param {boolean} props.checked
 * @param {(v: boolean) => void} props.onChange
 * @param {string} [props.label]
 * @param {string} [props.description]
 */
export default function PubToggle({ checked, onChange, label, description }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="flex w-full items-start gap-4 rounded-xl border border-[#2A3550] bg-[#111827] p-4 text-left transition duration-200 hover:border-[#7C5CFF]/35"
        >
            <span
                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition duration-200 ${
                    checked ? 'bg-gradient-to-r from-[#6C4CF1] to-[#8E6BFF] shadow-[0_0_16px_rgba(124,92,255,0.45)]' : 'bg-[#1A2235]'
                }`}
            >
                <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition duration-200 ${
                        checked ? 'left-5' : 'left-0.5'
                    }`}
                />
            </span>
            <span className="min-w-0 flex-1">
                {label ? <span className="block text-sm font-medium text-white">{label}</span> : null}
                {description ? <span className="mt-0.5 block text-sm text-[#9CA3AF]">{description}</span> : null}
            </span>
        </button>
    );
}

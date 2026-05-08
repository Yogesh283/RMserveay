/**
 * Shared page chrome: ambient glow + consistent vertical rhythm for all publisher screens.
 */
export default function PubPageFrame({ children, className = '' }) {
    return (
        <div className={`relative space-y-5 sm:space-y-6 ${className}`.trim()}>
            <div className="pointer-events-none absolute -top-6 left-8 h-24 w-24 rounded-full bg-[#7C3AED]/20 blur-3xl" />
            <div className="pointer-events-none absolute right-0 top-20 h-24 w-24 rounded-full bg-[#8E6BFF]/15 blur-3xl" />
            {children}
        </div>
    );
}

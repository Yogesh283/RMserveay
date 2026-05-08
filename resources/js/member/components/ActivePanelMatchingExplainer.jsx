/**
 * Active Panel Matching Income — premium fintech / crypto-MLM explainer card.
 *
 * Visual: dark purple + blue neon, glassmorphism, glowing binary tree,
 * pulsing pair-match animation, USDT income highlight box, carry-forward note.
 *
 * Self-contained — no external icon library, all SVG inline.
 * Tailwind only; works on mobile (single column) and desktop (two columns).
 */
export function ActivePanelMatchingExplainer({
    packageUsd = 10,
    matchingRate = 0.10,
    perPairUsd = 1,
    maxPairsPerDay = 20,
}) {
    const calc = `${(matchingRate * 100).toFixed(0)}% × ${packageUsd} USDT = ${perPairUsd} USDT`;

    return (
        <section
            className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0b0420] via-[#1a0b3d] to-[#040221] p-5 sm:p-7 shadow-[0_0_60px_rgba(124,58,237,0.25)]"
            aria-label="Active Panel Matching Income explainer"
        >
            {/* Ambient neon blobs */}
            <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-fuchsia-600/25 blur-[110px]" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-cyan-500/25 blur-[110px]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.18),transparent_55%)]" />

            {/* Header */}
            <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-200 backdrop-blur">
                        <PulseDot />
                        Active Panel Matching Income
                    </div>
                    <h2 className="mt-3 bg-gradient-to-r from-fuchsia-200 via-violet-100 to-cyan-200 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
                        1 Left + 1 Right = 1 Matching Pair
                    </h2>
                    <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-violet-200/80">
                        Har pair pe instant USDT income. Daily closing 12:00 AM IST par auto wallet credit hota hai.
                    </p>
                </div>
                <BadgeUSDT amount={perPairUsd} />
            </div>

            {/* Body grid */}
            <div className="relative mt-6 grid gap-5 lg:grid-cols-[1fr_1.05fr]">
                {/* Tree visualization */}
                <BinaryTreeCard packageUsd={packageUsd} perPairUsd={perPairUsd} />

                {/* Math breakdown */}
                <div className="space-y-4">
                    <ExplainerCard
                        icon={<WalletIcon />}
                        label="Package Amount"
                        valueLine={`${packageUsd} USDT`}
                        accent="from-violet-400 to-fuchsia-300"
                    />
                    <ExplainerCard
                        icon={<PercentIcon />}
                        label="Matching Bonus"
                        valueLine={`${(matchingRate * 100).toFixed(0)}%`}
                        accent="from-cyan-300 to-sky-300"
                    />
                    <ExplainerCard
                        icon={<CalcIcon />}
                        label="Calculation"
                        valueLine={calc}
                        accent="from-emerald-300 to-teal-300"
                        mono
                    />
                    <FinalResultCard amount={perPairUsd} />
                </div>
            </div>

            {/* Footnotes */}
            <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
                <FootChip
                    icon={<ClockIcon />}
                    title="Daily Closing"
                    body="Pair match aur wallet credit raat 12:00 AM IST par automatic"
                />
                <FootChip
                    icon={<CapIcon />}
                    title="Max Pairs / Day"
                    body={`Maximum ${maxPairsPerDay} pair per din match honge`}
                />
                <FootChip
                    icon={<CarryIcon />}
                    title="Carry Forward"
                    body="Higher leg ka leftover next day jayega — lower leg lapse ho jayega"
                />
            </div>
        </section>
    );
}

/* ─────────────── Sub-components ─────────────── */

function BinaryTreeCard({ packageUsd, perPairUsd }) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(217,70,239,0.18),transparent_70%)]" />

            <div className="relative">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-300/80">
                    Binary Tree
                </p>
                <h3 className="mt-1 text-base font-semibold text-white">Pair Formation</h3>
            </div>

            {/* Tree */}
            <div className="relative mt-6 flex flex-col items-center">
                {/* Top node */}
                <NodeBubble label="A" sub="You" tone="top" />

                {/* Connectors */}
                <svg
                    viewBox="0 0 240 80"
                    className="my-1 h-20 w-full max-w-[280px]"
                    aria-hidden="true"
                >
                    <defs>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#22d3ee" />
                            <stop offset="50%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2.5" result="b" />
                            <feMerge>
                                <feMergeNode in="b" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <line x1="120" y1="0" x2="40" y2="80" stroke="url(#lineGrad)" strokeWidth="2" filter="url(#glow)" />
                    <line x1="120" y1="0" x2="200" y2="80" stroke="url(#lineGrad)" strokeWidth="2" filter="url(#glow)" />
                    {/* Animated pulse dots flowing down */}
                    <circle r="2.5" fill="#f0abfc">
                        <animateMotion dur="2.4s" repeatCount="indefinite" path="M120,0 L40,80" />
                    </circle>
                    <circle r="2.5" fill="#7dd3fc">
                        <animateMotion dur="2.4s" repeatCount="indefinite" path="M120,0 L200,80" />
                    </circle>
                </svg>

                {/* Children */}
                <div className="grid w-full max-w-[280px] grid-cols-2 gap-3">
                    <NodeBubble label="L" sub="Left Active" tone="left" />
                    <NodeBubble label="R" sub="Right Active" tone="right" />
                </div>

                {/* Pair-match indicator */}
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.35)]">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                    </span>
                    1 Pair Matched → +{perPairUsd} USDT
                </div>

                <p className="mt-3 text-center text-[11px] text-violet-200/70">
                    Package: <span className="font-semibold text-fuchsia-200">{packageUsd} USDT</span> per side
                </p>
            </div>
        </div>
    );
}

function NodeBubble({ label, sub, tone }) {
    const ringClass =
        tone === 'top'
            ? 'from-fuchsia-500 via-violet-500 to-cyan-400 shadow-[0_0_30px_rgba(217,70,239,0.55)]'
            : tone === 'left'
            ? 'from-cyan-400 to-sky-400 shadow-[0_0_22px_rgba(34,211,238,0.55)]'
            : 'from-fuchsia-500 to-pink-500 shadow-[0_0_22px_rgba(236,72,153,0.55)]';
    const sizeClass = tone === 'top' ? 'h-16 w-16 text-xl' : 'h-14 w-14 text-base';

    return (
        <div className="flex flex-col items-center">
            <div
                className={`relative grid place-items-center rounded-full bg-gradient-to-br ${ringClass} ${sizeClass} font-black text-white`}
            >
                <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.45),transparent_50%)]" />
                {label}
            </div>
            <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                {sub}
            </span>
        </div>
    );
}

function ExplainerCard({ icon, label, valueLine, accent, mono }) {
    return (
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.06]">
            <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent}`} />
            <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-violet-200">
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300/80">
                        {label}
                    </p>
                    <p
                        className={`mt-1 truncate text-lg font-bold text-white ${
                            mono ? 'font-mono text-base tracking-tight' : ''
                        }`}
                    >
                        {valueLine}
                    </p>
                </div>
            </div>
        </div>
    );
}

function FinalResultCard({ amount }) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-300/30 bg-gradient-to-br from-emerald-500/15 via-emerald-400/10 to-cyan-500/15 p-4 shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-xl">
            <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/30 blur-3xl" />
            <div className="relative flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-emerald-300/40 bg-emerald-400/15 text-emerald-200">
                    <ProfitIcon />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/90">
                        Final Result
                    </p>
                    <p className="mt-0.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
                        +{amount} <span className="text-base text-emerald-200">USDT</span>
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-100/80">
                        Auto-credited to wallet at daily closing
                    </p>
                </div>
            </div>
        </div>
    );
}

function FootChip({ icon, title, body }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 backdrop-blur-xl">
            <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-md border border-white/10 bg-white/5 text-cyan-200">
                    {icon}
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-white">{title}</p>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-violet-200/75">{body}</p>
        </div>
    );
}

function BadgeUSDT({ amount }) {
    return (
        <div className="relative inline-flex items-center gap-2 self-start rounded-2xl border border-emerald-300/30 bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 px-3 py-2 shadow-[0_0_30px_rgba(16,185,129,0.25)] backdrop-blur-xl">
            <UsdtIcon />
            <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                    Per Pair
                </p>
                <p className="text-base font-black leading-tight text-white">+{amount} USDT</p>
            </div>
        </div>
    );
}

function PulseDot() {
    return (
        <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-80" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-300" />
        </span>
    );
}

/* ─── Inline icons (no library dependency) ─── */

function WalletIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v10a3 3 0 003 3h12a3 3 0 003-3v-7H7a2 2 0 010-4h13a2 2 0 00-2-2H6a3 3 0 00-3 3z" />
            <circle cx="17" cy="13" r="1.4" fill="currentColor" />
        </svg>
    );
}

function PercentIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="19" y1="5" x2="5" y2="19" />
            <circle cx="7.5" cy="7.5" r="2.5" />
            <circle cx="16.5" cy="16.5" r="2.5" />
        </svg>
    );
}

function CalcIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h2M14 19h2" />
        </svg>
    );
}

function ProfitIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l6-6 4 4 8-8" />
            <path d="M14 7h7v7" />
        </svg>
    );
}

function UsdtIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="#26A17B" />
            <path
                fill="#fff"
                d="M13 11.4V9.5h3.8V7H7.2v2.5H11v1.9c-3 .15-5.3.7-5.3 1.4 0 .7 2.3 1.25 5.3 1.4v4.3h2v-4.3c3-.15 5.3-.7 5.3-1.4 0-.7-2.3-1.25-5.3-1.4zm0 2.4v-.01c-.07.01-.45.04-1 .04-.44 0-.78-.02-.95-.03v.01c-2.7-.12-4.7-.6-4.7-1.16 0-.56 2-1.04 4.7-1.16v1.85c.18.01.53.04.96.04.55 0 .92-.04.99-.04v-1.85c2.7.12 4.7.6 4.7 1.16 0 .56-2 1.04-4.7 1.16z"
            />
        </svg>
    );
}

function ClockIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </svg>
    );
}

function CapIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h18M3 6h18M3 18h12" />
        </svg>
    );
}

function CarryIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h13" />
            <path d="M13 7l5 5-5 5" />
            <path d="M21 5v14" />
        </svg>
    );
}

export default ActivePanelMatchingExplainer;

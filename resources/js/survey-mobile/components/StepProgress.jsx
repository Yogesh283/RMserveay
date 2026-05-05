export default function StepProgress({ current, total = 5 }) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between text-xs font-medium text-slate-400">
                <span>
                    Step {current} of {total}
                </span>
                <span className="bg-gradient-to-r from-amber-300 via-violet-300 to-blue-400 bg-clip-text text-transparent">
                    {Math.round((current / total) * 100)}%
                </span>
            </div>
            <div className="flex gap-1.5">
                {Array.from({ length: total }, (_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            i < current
                                ? 'bg-gradient-to-r from-[#F59E0B] via-[#7C3AED] to-[#3B82F6] shadow-[0_0_14px_rgba(124,58,237,0.55)]'
                                : i === current - 1
                                  ? 'bg-gradient-to-r from-[#F59E0B] to-[#7C3AED] shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                                  : 'bg-white/[0.08]'
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}

/** Shared canvas behind member pages — matches MobileShell (#0B0F1A + violet glow). */
export default function RmsPageBackdrop() {
    return (
        <>
            <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[#0B0F1A] via-[#0B0F1A] to-[#070b14]" aria-hidden />
            <div
                className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,rgba(108,76,241,0.18),transparent_50%)]"
                aria-hidden
            />
            <div
                className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_100%_30%,rgba(142,107,255,0.08),transparent_42%)]"
                aria-hidden
            />
        </>
    );
}

import { RM } from '../survey-mobile/theme';

/** RM tokens → rgba() for gradients (same as MobileShell / HomePage) */
export function rgbaHex(hex, alpha) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

/** Same stack as MobileShell (/survey/dashboard) + subtle mesh / horizon lines */
export default function RmSurveyBackdrop() {
    const p = (a) => rgbaHex(RM.purple, a);
    const b = (a) => rgbaHex(RM.blue, a);
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(to bottom, ${RM.bgDeep}, ${RM.bgMid}, #070b14)` }}
            />
            <div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(ellipse 100% 60% at 50% -10%, ${p(0.28)}, transparent 50%)`,
                }}
            />
            <div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(circle at 100% 30%, ${b(0.12)}, transparent 40%)`,
                }}
            />
            <div
                className="absolute inset-0 opacity-[0.38] mix-blend-screen"
                style={{
                    backgroundImage: [
                        `repeating-linear-gradient(118deg, transparent 0px, transparent 72px, ${p(0.1)} 72px, ${p(0.1)} 73px)`,
                        `repeating-linear-gradient(-32deg, transparent 0px, transparent 96px, ${b(0.07)} 96px, ${b(0.07)} 97px)`,
                    ].join(', '),
                }}
            />
            <div
                className="absolute inset-x-0 top-[14%] h-px blur-[0.5px]"
                style={{ background: `linear-gradient(90deg, transparent, ${p(0.38)}, transparent)` }}
            />
            <div
                className="absolute inset-x-0 top-[42%] h-px opacity-80"
                style={{ background: `linear-gradient(90deg, transparent, ${b(0.3)}, transparent)` }}
            />
            <div
                className="absolute inset-x-0 bottom-[22%] h-px opacity-65"
                style={{ background: `linear-gradient(90deg, transparent, ${p(0.22)}, transparent)` }}
            />
        </div>
    );
}

import { pub } from '../ui/pubTheme';

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {import('react').ReactNode} [props.actions]
 */
export default function PubPageHeader({ title, subtitle, actions }) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${pub.text}`}>{title}</h1>
                {subtitle ? <p className={`mt-1.5 max-w-2xl text-sm leading-relaxed ${pub.muted}`}>{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
    );
}

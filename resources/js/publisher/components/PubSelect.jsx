import { pub } from '../ui/pubTheme';

/**
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.className]
 * @param {string} [props.id]
 * @param {import('react').ReactNode} props.children
 */
export default function PubSelect({ label, id, className = '', children, ...rest }) {
    const sid = id || (label ? `sel-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
    return (
        <div className={className}>
            {label ? (
                <label htmlFor={sid} className={pub.label}>
                    {label}
                </label>
            ) : null}
            <select id={sid} className={pub.select} {...rest}>
                {children}
            </select>
        </div>
    );
}

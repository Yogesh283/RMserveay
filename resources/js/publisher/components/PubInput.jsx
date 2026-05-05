import { pub } from '../ui/pubTheme';

/**
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.className]
 * @param {string} [props.id]
 */
export default function PubInput({ label, id, className = '', ...rest }) {
    const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);
    return (
        <div className={className}>
            {label ? (
                <label htmlFor={inputId} className={pub.label}>
                    {label}
                </label>
            ) : null}
            <input id={inputId} className={pub.input} {...rest} />
        </div>
    );
}

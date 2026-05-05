import { pub } from '../ui/pubTheme';

/**
 * @param {object} props
 * @param {'primary' | 'secondary'} [props.variant]
 * @param {string} [props.className]
 * @param {import('react').ReactNode} [props.children]
 */
export default function PubButton({ variant = 'primary', className = '', children, ...rest }) {
    const base = variant === 'secondary' ? pub.btnSecondary : pub.btnPrimary;
    return (
        <button type="button" className={`${base} ${className}`.trim()} {...rest}>
            {children}
        </button>
    );
}

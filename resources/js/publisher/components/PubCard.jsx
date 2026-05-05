import { pub } from '../ui/pubTheme';

/**
 * @param {object} props
 * @param {string} [props.className]
 * @param {boolean} [props.hover]
 * @param {import('react').ReactNode} props.children
 */
export default function PubCard({ className = '', hover = false, children, ...rest }) {
    return (
        <div className={`${pub.card} ${hover ? pub.cardHover : ''} ${className}`.trim()} {...rest}>
            {children}
        </div>
    );
}

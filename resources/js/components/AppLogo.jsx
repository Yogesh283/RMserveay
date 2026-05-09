import { APP_LOGO_URL } from '../lib/branding';

/**
 * Site logo (`public/images/logo.png`).
 * Transparent PNG — no outer frame; sizing via `className` (default h-20 w-20).
 */
export default function AppLogo({ alt = '', className, imgClassName = '', ...rest }) {
    const defaultSize = 'h-20 w-20';
    return (
        <img
            src={APP_LOGO_URL}
            alt={alt}
            decoding="async"
            className={['shrink-0 object-contain object-center', className ?? defaultSize, imgClassName].filter(Boolean).join(' ')}
            {...rest}
        />
    );
}

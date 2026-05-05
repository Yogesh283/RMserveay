import { useCallback, useState } from 'react';
import BootstrapSplash from './BootstrapSplash';
import RouteTransitionBar from './RouteTransitionBar';

const SPLASH_KEY = 'rmserve_bootstrap_splash_v1';

export default function AppChrome({ children }) {
    const [splashDone, setSplashDone] = useState(() => {
        if (typeof sessionStorage === 'undefined') return false;
        return sessionStorage.getItem(SPLASH_KEY) === '1';
    });

    const handleSplashComplete = useCallback(() => {
        try {
            sessionStorage.setItem(SPLASH_KEY, '1');
        } catch {
            /* storage full / private mode */
        }
        setSplashDone(true);
    }, []);

    return (
        <>
            {children}
            <RouteTransitionBar enabled={splashDone} />
            {!splashDone ? <BootstrapSplash onComplete={handleSplashComplete} /> : null}
        </>
    );
}

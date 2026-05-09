import { useTranslation } from 'react-i18next';

const LANGUAGES = [
    { code: 'en', label: 'English', shortLabel: 'EN' },
    { code: 'hi', label: 'Hindi', shortLabel: 'HI' },
    { code: 'es', label: 'Spanish', shortLabel: 'ES' },
    { code: 'zh', label: 'Chinese', shortLabel: 'ZH' },
    { code: 'fr', label: 'French', shortLabel: 'FR' },
    { code: 'de', label: 'German', shortLabel: 'DE' },
];

function IconGlobeSmall() {
    return (
        <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
            <path stroke="#7DD3FC" strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z" />
        </svg>
    );
}

/**
 * Language selector (shared header / home). Persists via i18next-browser-languagedetector (localStorage).
 * @param {{ variant?: 'default' | 'compact' | 'menu'; density?: 'default' | 'tight' }} props
 * - `compact` — header bar (globe + small select)
 * - `compact` + `density="tight"` — slimmer row for mobile drawer
 * - `menu` — mobile drawer (full label + select, touch-friendly)
 */
export default function HomeLanguageSwitcher({ variant = 'default', density = 'default' }) {
    const { i18n, t } = useTranslation();
    const current = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
    const value = LANGUAGES.some((l) => l.code === current) ? current : 'en';

    const selectBase =
        'cursor-pointer rounded-lg border border-white/[0.14] bg-[rgba(15,23,42,0.85)] text-left font-medium text-white shadow-sm ring-1 ring-white/[0.06] backdrop-blur-sm transition hover:border-[#7C3AED]/40 hover:bg-white/[0.08] focus:border-[#7C3AED]/50 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/35';

    if (variant === 'compact') {
        const tight = density === 'tight';
        const selectSize = tight
            ? 'min-h-[26px] w-auto min-w-0 px-1 py-0 pr-5 text-[10px]'
            : 'min-h-[28px] w-auto min-w-0 px-1.5 py-0 pr-5 text-[11px]';
        return (
            <label
                className={`inline-flex min-w-0 items-center gap-1 ${tight ? 'w-auto justify-center' : ''}`}
            >
                <span className="sr-only">{t('common.language')}</span>
                <IconGlobeSmall />
                <select
                    value={value}
                    onChange={(e) => i18n.changeLanguage(e.target.value)}
                    className={`${selectBase} ${selectSize}`}
                    aria-label={t('common.language')}
                    title={LANGUAGES.find((l) => l.code === value)?.label}
                >
                    {LANGUAGES.map(({ code, shortLabel, label }) => (
                        <option key={code} value={code} title={label}>
                            {shortLabel}
                        </option>
                    ))}
                </select>
            </label>
        );
    }

    if (variant === 'menu') {
        return (
            <label className="flex w-full min-w-0 flex-col gap-2.5 rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.07] to-white/[0.02] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.04]">
                <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    <IconGlobeSmall />
                    {t('common.language')}
                </span>
                <select
                    value={value}
                    onChange={(e) => i18n.changeLanguage(e.target.value)}
                    className={`${selectBase} min-h-[48px] w-full rounded-xl border-white/[0.12] bg-[rgba(8,12,22,0.65)] px-3.5 py-3 text-[15px]`}
                    aria-label={t('common.language')}
                >
                    {LANGUAGES.map(({ code, label }) => (
                        <option key={code} value={code}>
                            {label}
                        </option>
                    ))}
                </select>
            </label>
        );
    }

    return (
        <label className="inline-flex min-w-0 max-w-full flex-col items-stretch gap-1 sm:inline-flex sm:flex-row sm:items-center sm:gap-2">
            <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:text-xs">
                {t('common.language')}
            </span>
            <select
                value={value}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className={`${selectBase} w-full min-w-[140px] max-w-[220px] px-3 py-2 text-xs sm:w-auto sm:text-sm`}
                aria-label={t('common.language')}
            >
                {LANGUAGES.map(({ code, label }) => (
                    <option key={code} value={code}>
                        {label}
                    </option>
                ))}
            </select>
        </label>
    );
}

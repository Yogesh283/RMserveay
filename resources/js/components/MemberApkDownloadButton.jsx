import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getMemberApkDownload } from '../lib/memberApk';

function AndroidIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l1.2 2.1M15.75 4.5l-1.2 2.1M6.75 8.25h10.5M7.5 19.5h9a1.5 1.5 0 001.5-1.5v-7.5a1.5 1.5 0 00-1.5-1.5h-9a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5z"
            />
        </svg>
    );
}

function ArrowIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
    );
}

const VARIANT_STYLES = {
    default:
        'home-apk-highlight border-2 border-emerald-300/80 bg-gradient-to-r from-[#10B981] via-[#14B8A6] to-[#22D3EE] ring-2 ring-emerald-200/40 shadow-[0_8px_28px_rgba(16,185,129,0.22)]',
    auth: 'mt-3 border-2 border-dashed border-[#A78BFA]/55 bg-[linear-gradient(145deg,rgba(15,23,42,0.92),rgba(49,46,129,0.45))] ring-1 ring-[#7C3AED]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_36px_rgba(0,0,0,0.45)] hover:border-[#C4B5FD]/70 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_40px_rgba(124,58,237,0.28)]',
};

const VARIANT_TITLE = {
    default: 'text-[13px] tracking-tight sm:text-[15px]',
    auth: 'text-[15px] font-extrabold tracking-tight text-white drop-shadow-[0_0_14px_rgba(196,181,253,0.85)] sm:text-base',
};

const VARIANT_BADGE = {
    default: 'bg-white/95 text-emerald-700',
    auth: 'bg-gradient-to-r from-[#FDE68A] to-[#FBBF24] text-violet-950 shadow-[0_0_12px_rgba(251,191,36,0.45)]',
};

const VARIANT_HINT = {
    default: 'text-emerald-50/95',
    auth: 'text-[13px] font-semibold text-[#BFDBFE] sm:text-sm',
};

const VARIANT_ICON = {
    default: 'border-white/35 bg-white/20 shadow-[0_0_16px_rgba(255,255,255,0.3)]',
    auth: 'border-[#38BDF8]/55 bg-[#38BDF8]/20 text-[#BAE6FD] shadow-[0_0_18px_rgba(56,189,248,0.45)]',
};

const VARIANT_ARROW = {
    default: 'border-white/30 bg-white/15',
    auth: 'border-[#C4B5FD]/45 bg-[#7C3AED]/25 text-[#E9D5FF]',
};

/** Website-only Android APK download (hidden inside native app WebView). */
export default function MemberApkDownloadButton({ className = '', variant = 'default' }) {
    const { t } = useTranslation();
    const memberApk = useMemo(() => getMemberApkDownload(), []);
    const v = VARIANT_STYLES[variant] ? variant : 'default';

    if (!memberApk.available) {
        return null;
    }

    return (
        <a
            href={memberApk.url}
            download
            className={[
                'group relative inline-flex min-h-[52px] w-full items-center justify-between overflow-hidden rounded-[14px] px-3 py-3 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] sm:rounded-[16px] sm:px-4 sm:py-3.5',
                VARIANT_STYLES[v],
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <span
                className={[
                    'pointer-events-none absolute inset-0 opacity-60',
                    v === 'auth'
                        ? 'bg-[radial-gradient(ellipse_at_20%_0%,rgba(124,58,237,0.35),transparent_55%),radial-gradient(ellipse_at_90%_100%,rgba(56,189,248,0.2),transparent_50%)]'
                        : 'bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.22)_50%,transparent_65%)]',
                ].join(' ')}
                aria-hidden
            />
            <span className="relative inline-flex min-w-0 flex-1 items-center gap-2.5">
                <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:h-10 sm:w-10 ${VARIANT_ICON[v]}`}
                >
                    <AndroidIcon />
                </span>
                <span className="text-left leading-snug">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className={VARIANT_TITLE[v]}>{t('home.downloadApk')}</span>
                        <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider sm:text-[10px] ${VARIANT_BADGE[v]}`}
                        >
                            {t('home.downloadApkBadge')}
                        </span>
                    </span>
                    <span className={`mt-1 block ${VARIANT_HINT[v]}`}>{t('home.downloadApkHint')}</span>
                </span>
            </span>
            <span
                className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:translate-x-0.5 sm:h-10 sm:w-10 ${VARIANT_ARROW[v]}`}
            >
                <ArrowIcon />
            </span>
        </a>
    );
}

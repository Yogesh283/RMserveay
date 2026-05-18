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

/** Website-only Android APK download (hidden inside native app WebView). */
export default function MemberApkDownloadButton({ className = '' }) {
    const { t } = useTranslation();
    const memberApk = useMemo(() => getMemberApkDownload(), []);

    if (!memberApk.available) {
        return null;
    }

    return (
        <a
            href={memberApk.url}
            download
            className={[
                'home-apk-highlight group relative mt-2 inline-flex min-h-[52px] w-full items-center justify-between overflow-hidden rounded-[14px] border-2 border-emerald-300/80 bg-gradient-to-r from-[#10B981] via-[#14B8A6] to-[#22D3EE] px-3 py-3 text-sm font-bold text-white ring-2 ring-emerald-200/40 transition-all duration-300 hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] sm:rounded-[16px] sm:px-4 sm:py-3.5',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <span
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.22)_50%,transparent_65%)] opacity-60"
                aria-hidden
            />
            <span className="relative inline-flex min-w-0 flex-1 items-center gap-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/35 bg-white/20 shadow-[0_0_16px_rgba(255,255,255,0.3)] sm:h-9 sm:w-9">
                    <AndroidIcon />
                </span>
                <span className="text-left leading-tight">
                    <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13px] tracking-tight sm:text-[15px]">{t('home.downloadApk')}</span>
                        <span className="rounded-full bg-white/95 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700 sm:px-2 sm:text-[10px]">
                            {t('home.downloadApkBadge')}
                        </span>
                    </span>
                    <span className="mt-0.5 block text-[10px] font-medium text-emerald-50/95 sm:text-[11px]">{t('home.downloadApkHint')}</span>
                </span>
            </span>
            <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/15 text-white transition-transform group-hover:translate-x-0.5 sm:h-9 sm:w-9">
                <ArrowIcon />
            </span>
        </a>
    );
}

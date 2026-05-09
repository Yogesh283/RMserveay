import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { RmsCard, RmsScreenTitle } from '../components/rms';

const badgeActive =
    'inline-flex shrink-0 items-center rounded-full bg-[#6C4CF1]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#8E6BFF] ring-1 ring-[#8E6BFF]/30';

const STREAM_KEYS = ['direct', 'panelMatch', 'subPanelMatch', 'superSubPanelMatch', 'level'];

const INCOME_CARDS = [
    { to: '/member/active-panels', cardKey: 'activePanels', active: true },
    { to: '/member/sub-panels', cardKey: 'subPanels', active: true },
    { to: '/member/super-sub-panels', cardKey: 'superSubPanels', active: true },
    { to: '/member/team', cardKey: 'team', active: true },
    { to: '/member/transactions', cardKey: 'transactions', active: true },
    { to: '/member/panel-matching', cardKey: 'panelMatching', active: true },
    { to: '/member/sub-panel-matching', cardKey: 'subPanelMatching', active: true },
    { to: '/member/super-sub-panel-matching', cardKey: 'superSubPanelMatching', active: true },
    { to: '/member/wallet', cardKey: 'wallet', active: true },
    { to: '/member/terms', cardKey: 'terms', active: true },
];

export default function MemberProgrammePage() {
    const { t, i18n } = useTranslation();

    const incomeTypes = useMemo(
        () =>
            INCOME_CARDS.map((item) => ({
                ...item,
                title: t(`member.programme.cards.${item.cardKey}.title`),
                desc: t(`member.programme.cards.${item.cardKey}.desc`),
            })),
        [t, i18n.resolvedLanguage],
    );

    return (
        <div className="relative space-y-8">
            <RmsScreenTitle
                eyebrow={t('member.programme.eyebrow')}
                title={t('member.programme.title')}
                subtitle={t('member.programme.subtitle')}
            />

            <RmsCard variant="neon" className="!p-4 sm:!p-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0AEC0]">{t('member.programme.statusTitle')}</p>
                <p className="mt-1 text-sm text-white/95">{t('member.programme.statusBody')}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                    {STREAM_KEYS.map((key) => (
                        <li key={key}>
                            <span className={badgeActive}>
                                {t(`member.programme.streams.${key}`)} · {t('member.ui.active')}
                            </span>
                        </li>
                    ))}
                </ul>
            </RmsCard>

            <RmsCard variant="elevated" className="!p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-white">{t('member.ui.typesOfIncome')}</h2>
                    <span className={badgeActive}>{t('member.ui.allActive')}</span>
                </div>
                <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[#A0AEC0]">
                    {STREAM_KEYS.map((key) => (
                        <li key={key}>
                            {t(`member.programme.streams.${key}`)}{' '}
                            <span className="text-xs font-medium text-[#8E6BFF]">{t('member.ui.activeParen')}</span>
                        </li>
                    ))}
                </ol>
            </RmsCard>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {incomeTypes.map((item) => (
                    <Link key={item.to} to={item.to}>
                        <RmsCard
                            variant="elevated"
                            className="group h-full !p-5 transition hover:ring-1 hover:ring-[#8E6BFF]/40 active:scale-[0.99]"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-transparent bg-gradient-to-r from-[#8E6BFF] to-[#6C4CF1] bg-clip-text">
                                    {t('member.ui.learnMore')}
                                </span>
                                {item.active ? <span className={badgeActive}>{t('member.ui.active')}</span> : null}
                            </div>
                            <p className="mt-2 text-lg font-bold text-white">{item.title}</p>
                            <p className="mt-2 text-sm text-[#A0AEC0]">{item.desc}</p>
                            <span className="mt-4 inline-block text-sm font-medium text-[#8E6BFF] group-hover:underline">{t('member.ui.openArrow')}</span>
                        </RmsCard>
                    </Link>
                ))}
            </div>
        </div>
    );
}

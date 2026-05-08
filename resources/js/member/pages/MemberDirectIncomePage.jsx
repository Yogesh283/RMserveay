import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MemberHeading, MemberNote, MemberP, MemberSubheading, MemberUl } from '../components/MemberTypography';

const badgeOk =
    'inline-flex shrink-0 items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500 ring-1 ring-emerald-500/30 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/25';

const badgeNo =
    'inline-flex shrink-0 items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 ring-1 ring-amber-500/30 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/25';

export default function MemberDirectIncomePage() {
    const { dark } = useOutletContext();
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState(null);

    const load = useCallback(async () => {
        setLoadError(null);
        try {
            const { data: json } = await window.axios.get('api/member/programme/direct-income');
            setData(json);
        } catch (e) {
            setLoadError(e.response?.data?.message ?? e.message ?? 'Failed to load');
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const card = `rounded-xl border p-6 ${dark ? 'border-white/10 bg-[#1e293b]' : 'border-gray-200 bg-white'} shadow-sm`;

    return (
        <div className="space-y-8">
            <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>RM Survey</p>
                <MemberHeading dark={dark}>Direct Income</MemberHeading>
                <MemberP dark={dark}>
                    <span className="block font-medium text-[15px]">Description</span>
                    Direct Income rewards you for each person you personally refer. When a direct referral earns survey income or pays panel fees, you receive{' '}
                    <strong>10% commission</strong> on that activity only if you meet the eligibility rules below.
                </MemberP>
            </div>

            {loadError && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${dark ? 'border-red-400/40 bg-red-950/40 text-red-200' : 'border-red-200 bg-red-50 text-red-800'}`}>
                    {loadError}
                </div>
            )}

            {data && (
                <section className={card}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <MemberSubheading dark={dark}>Programme status (live)</MemberSubheading>
                        <span className={data.eligible ? badgeOk : badgeNo}>{data.eligible ? 'Eligible — 10% active' : 'Not eligible yet'}</span>
                    </div>
                    <p className={`mt-2 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Rate: <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{data.rate_percent}%</span> of qualifying referral
                        activity (survey credits & fee payments), configured as <span className="tabular-nums">{data.rate}</span> in config.
                    </p>
                    <ul className={`mt-4 space-y-2 text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <li className="flex flex-wrap items-center justify-between gap-2">
                            <span>Active panelist (activation + minimum panel fee paid)</span>
                            <span className={data.requirements.active_panelist ? 'text-emerald-500' : 'text-amber-600'}>{data.requirements.active_panelist ? 'Yes' : 'No'}</span>
                        </li>
                        <li className="flex flex-wrap items-center justify-between gap-2">
                            <span>$1 activation paid</span>
                            <span className={data.requirements.activation_fee_usd_paid ? 'text-emerald-500' : 'text-amber-600'}>
                                {data.requirements.activation_fee_usd_paid ? 'Yes' : 'No'}
                            </span>
                        </li>
                        <li className="flex flex-wrap items-center justify-between gap-2">
                            <span>Minimum $10 panel fee paid</span>
                            <span className={data.requirements.minimum_panel_fee_usd_paid ? 'text-emerald-500' : 'text-amber-600'}>
                                {data.requirements.minimum_panel_fee_usd_paid ? 'Yes' : 'No'}
                            </span>
                        </li>
                        {data.info?.has_panel_slot !== undefined ? (
                            <li className="flex flex-wrap items-center justify-between gap-2 opacity-80">
                                <span>Panel slot purchased <span className="text-[10px] text-slate-400">(informational — not required)</span></span>
                                <span className={data.info.has_panel_slot ? 'text-emerald-500' : 'text-slate-400'}>{data.info.has_panel_slot ? 'Yes' : 'No'}</span>
                            </li>
                        ) : null}
                    </ul>
                </section>
            )}

            <section className={card}>
                <MemberSubheading dark={dark}>Income structure</MemberSubheading>
                <MemberUl
                    dark={dark}
                    items={[
                        'Flat income: 10% on qualifying direct referral activity',
                        'Each direct referral — 10% on their survey earnings or panel fee payments when you are eligible',
                    ]}
                />
            </section>

            <section className={card}>
                <MemberSubheading dark={dark}>Eligibility condition</MemberSubheading>
                <MemberUl
                    dark={dark}
                    items={[
                        'Requirements to earn this income:',
                        'You must be an active panelist (activation + minimum panel fee completed)',
                        '$1 activation fee paid',
                        'Minimum $10 panel fee paid',
                        'As soon as a referral activates and buys any panel, the 10% commission is credited.',
                    ]}
                />
            </section>

            <section className={card}>
                <MemberSubheading dark={dark}>How it works</MemberSubheading>
                <MemberUl
                    dark={dark}
                    items={[
                        'You invite a new user (referral link / sponsor)',
                        'They purchase a panel or complete surveys and generate income',
                        'You receive 10% direct commission to your wallet when you are eligible',
                    ]}
                />
            </section>

            <MemberNote dark={dark}>
                <strong className="block">Key benefit</strong>
                <MemberUl
                    dark={dark}
                    items={[
                        'Earn from every direct referral when activity qualifies',
                        'More direct referrals mean more income — 10% each time',
                    ]}
                />
                <MemberP dark={dark}>
                    <strong>Summary:</strong> Direct Income = active panelist + referral programme + 10% commission. Live eligibility is shown in the status card above.
                </MemberP>
            </MemberNote>
        </div>
    );
}

import { useOutletContext } from 'react-router-dom';
import { MemberHeading, MemberNote, MemberP, MemberSubheading, MemberUl } from '../components/MemberTypography';

export default function MemberTermsPage() {
    const { dark } = useOutletContext();

    return (
        <div className="space-y-8">
            <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>RM Survey</p>
                <MemberHeading dark={dark}>Terms & conditions</MemberHeading>
                <MemberP dark={dark}>
                    These programme rules explain deposits, caps, transfers, survey payouts, withdrawals, and wallet usage. RM Survey may update
                    policies — check notices inside the app.
                </MemberP>
            </div>

            <section className={`rounded-xl border p-6 ${dark ? 'border-white/10 bg-[#1e293b]' : 'border-gray-200 bg-white'} shadow-sm`}>
                <MemberSubheading dark={dark}>1 · Minimum deposit</MemberSubheading>
                <MemberUl
                    dark={dark}
                    items={['Members may start deposits from $1 where offered', 'All transfers must use approved networks (USDT BEP-20)']}
                />
            </section>

            <section className={`rounded-xl border p-6 ${dark ? 'border-white/10 bg-[#1e293b]' : 'border-gray-200 bg-white'} shadow-sm`}>
                <MemberSubheading dark={dark}>2 · Income capping</MemberSubheading>
                <MemberP dark={dark}>Daily and programme caps may apply. You cannot exceed published limits in a single settlement window.</MemberP>
            </section>

            <section className={`rounded-xl border p-6 ${dark ? 'border-white/10 bg-[#1e293b]' : 'border-gray-200 bg-white'} shadow-sm`}>
                <MemberSubheading dark={dark}>3 · Transfers & benefits</MemberSubheading>
                <MemberUl
                    dark={dark}
                    items={[
                        'Internal transfers may be available between eligible wallets.',
                        'P2P transfers can fund activation when enabled.',
                    ]}
                />
            </section>

            <section className={`rounded-xl border p-6 ${dark ? 'border-white/10 bg-[#1e293b]' : 'border-gray-200 bg-white'} shadow-sm`}>
                <MemberSubheading dark={dark}>4 · Survey payment cycle</MemberSubheading>
                <MemberP dark={dark}>
                    Survey rewards typically credit after a cooling period — illustrated as 7 days from completion date (Day 0 = completion; Day 7 =
                    payout window). Exact timing follows wallet ledger entries.
                </MemberP>
            </section>

            <section className={`rounded-xl border p-6 ${dark ? 'border-white/10 bg-[#1e293b]' : 'border-gray-200 bg-white'} shadow-sm`}>
                <MemberSubheading dark={dark}>5 · Withdrawal processing</MemberSubheading>
                <MemberUl
                    dark={dark}
                    items={[
                        'Requests aim to settle quickly — illustrative SLA: within 24 hours for approved requests.',
                        'Paid in USDT (BEP-20) unless otherwise stated.',
                    ]}
                />
            </section>

            <section className={`rounded-xl border p-6 ${dark ? 'border-white/10 bg-[#1e293b]' : 'border-gray-200 bg-white'} shadow-sm`}>
                <MemberSubheading dark={dark}>6 · Wallet usage</MemberSubheading>
                <MemberP dark={dark}>Withdrawals route to verified external wallets that support USDT BEP-20. Exchange compatibility is member responsibility.</MemberP>
            </section>

            <section className={`rounded-xl border p-6 ${dark ? 'border-white/10 bg-[#1e293b]' : 'border-gray-200 bg-white'} shadow-sm`}>
                <MemberSubheading dark={dark}>7 · Minimum withdrawal</MemberSubheading>
                <MemberP dark={dark}>Minimum withdrawal amount: $10 — requests below the threshold cannot be processed.</MemberP>
            </section>

            <section className={`rounded-xl border p-6 ${dark ? 'border-white/10 bg-[#1e293b]' : 'border-gray-200 bg-white'} shadow-sm`}>
                <MemberSubheading dark={dark}>8 · Survey withdrawal timing</MemberSubheading>
                <MemberP dark={dark}>Survey income withdrawals require the reward to age — typically at least 7 days after accrual before cash-out eligibility.</MemberP>
            </section>

            <MemberNote dark={dark}>
                <MemberUl
                    dark={dark}
                    items={[
                        'All payouts credit through the official wallet ledger.',
                        'Rules enforce fairness and sustainability.',
                        'Survey income may release on weekly-style cycles.',
                    ]}
                />
                <MemberP dark={dark}>
                    <strong>Commitment:</strong> secure transactions, predictable cycles, fast withdrawals — transparent, rule-based programmes.
                </MemberP>
            </MemberNote>
        </div>
    );
}

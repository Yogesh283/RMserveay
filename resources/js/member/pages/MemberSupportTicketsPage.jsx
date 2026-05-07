import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { prepareSanctum } from '../../lib/auth';
import { RmsCard, RmsScreenTitle } from '../components/rms';

export default function MemberSupportTicketsPage() {
    const { t, i18n } = useTranslation();
    const [rows, setRows] = useState([]);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [ok, setOk] = useState(null);
    const [err, setErr] = useState(null);

    const loadTickets = useCallback(async () => {
        setErr(null);
        setLoading(true);
        try {
            await prepareSanctum();
            const { data } = await window.axios.get('api/member/support-tickets', {
                params: { per_page: 20 },
            });
            setRows(data?.data ?? []);
        } catch (e) {
            setErr(e.response?.data?.message ?? e.message ?? t('member.ui.failedToLoad'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    async function submitTicket(e) {
        e.preventDefault();
        setErr(null);
        setOk(null);
        setSubmitting(true);
        try {
            await prepareSanctum();
            const { data } = await window.axios.post('api/member/support-tickets', {
                subject: subject.trim(),
                message: message.trim(),
            });
            setOk(data?.message ?? t('member.supportTickets.submitSuccess'));
            setSubject('');
            setMessage('');
            await loadTickets();
        } catch (e) {
            const m = e.response?.data?.message ?? e.response?.data?.errors ?? e.message;
            setErr(typeof m === 'object' ? JSON.stringify(m) : m);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="relative space-y-4">
            <div className="pointer-events-none absolute -top-10 right-0 h-40 w-40 rounded-full bg-violet-600/15 blur-[85px]" />
            <RmsScreenTitle
                eyebrow={t('member.supportTickets.eyebrow')}
                title={t('member.supportTickets.title')}
                subtitle={t('member.supportTickets.subtitle')}
            />

            <RmsCard variant="elevated" className="space-y-4 !rounded-[20px] !border-violet-300/20 !bg-[#0b1020]/75 !p-4 shadow-[0_0_28px_rgba(139,92,246,0.12)] backdrop-blur-xl" padding>
                <form onSubmit={submitTicket} className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">
                            {t('member.supportTickets.subject')}
                        </label>
                        <input
                            type="text"
                            required
                            maxLength={140}
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder={t('member.supportTickets.subjectPlaceholder')}
                            className="w-full rounded-xl border border-violet-300/20 bg-[#0B0F1A]/90 px-3 py-2 text-sm text-white shadow-[0_0_14px_rgba(139,92,246,0.08)] focus:border-[#8E6BFF]/50 focus:outline-none focus:ring-2 focus:ring-[#6C4CF1]/25"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">
                            {t('member.supportTickets.message')}
                        </label>
                        <textarea
                            required
                            minLength={10}
                            rows={5}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={t('member.supportTickets.messagePlaceholder')}
                            className="w-full rounded-xl border border-violet-300/20 bg-[#0B0F1A]/90 px-3 py-2 text-sm text-white shadow-[0_0_14px_rgba(139,92,246,0.08)] focus:border-[#8E6BFF]/50 focus:outline-none focus:ring-2 focus:ring-[#6C4CF1]/25"
                        />
                    </div>

                    {ok ? <p className="text-sm text-emerald-400">{ok}</p> : null}
                    {err ? <p className="text-sm text-red-400">{err}</p> : null}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-xl bg-gradient-to-r from-[#6C4CF1] to-[#8E6BFF] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(124,58,237,0.3)] transition hover:brightness-110 disabled:opacity-50"
                    >
                        {submitting ? t('member.supportTickets.submitting') : t('member.supportTickets.submit')}
                    </button>
                </form>
            </RmsCard>

            <RmsCard variant="inset" className="!rounded-[20px] !border-violet-300/20 !bg-[#0b1020]/75 !p-0 overflow-x-auto backdrop-blur-xl" padding={false}>
                {loading ? (
                    <p className="p-4 text-sm text-[#A0AEC0]">{t('member.loading')}</p>
                ) : rows.length === 0 ? (
                    <p className="p-4 text-sm text-[#A0AEC0]">{t('member.supportTickets.noTickets')}</p>
                ) : (
                    <table className="w-full min-w-[640px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/[0.02] text-[#A0AEC0]">
                                <th className="px-4 py-3 font-semibold">{t('member.supportTickets.colDate')}</th>
                                <th className="px-4 py-3 font-semibold">{t('member.supportTickets.colTicket')}</th>
                                <th className="px-4 py-3 font-semibold">{t('member.supportTickets.colSubject')}</th>
                                <th className="px-4 py-3 font-semibold">{t('member.supportTickets.colStatus')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id} className="border-b border-white/5 transition hover:bg-violet-500/[0.06]">
                                    <td className="px-4 py-3 text-xs text-[#A0AEC0]">
                                        {row.created_at ? new Date(row.created_at).toLocaleString(i18n.language) : t('member.ui.dash')}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-white">{row.ticket_no}</td>
                                    <td className="px-4 py-3 text-[#CBD5E1]">{row.subject}</td>
                                    <td className="px-4 py-3 text-amber-300">{row.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </RmsCard>
        </div>
    );
}

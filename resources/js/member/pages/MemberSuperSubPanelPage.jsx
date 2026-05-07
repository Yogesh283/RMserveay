import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { prepareSanctum } from '../../lib/auth';
import { MatchingIncomeTable } from '../components/MatchingIncomeTable';
import { MemberHeading } from '../components/MemberTypography';

export default function MemberSuperSubPanelPage() {
    const { dark } = useOutletContext();
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoadError(null);
        setLoading(true);
        try {
            await prepareSanctum();
            const { data: json } = await window.axios.get('api/member/programme/super-sub-panel-matching');
            setData(json);
        } catch (e) {
            setLoadError(e.response?.data?.message ?? e.message ?? 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="relative space-y-4">
            <div className="pointer-events-none absolute -top-8 right-0 h-36 w-36 rounded-full bg-violet-600/15 blur-[75px]" />
            <header className="space-y-1">
                <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-violet-300' : 'text-violet-600'}`}>RM Survey</p>
                <MemberHeading dark={dark}>Super Panel Matching Income</MemberHeading>
            </header>

            {loadError ? (
                <div className={`rounded-lg border px-4 py-3 text-sm ${dark ? 'border-red-400/40 bg-red-950/40 text-red-200' : 'border-red-200 bg-red-50 text-red-800'}`}>
                    {loadError}
                </div>
            ) : null}

            {loading && !loadError ? (
                <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Loading…</p>
            ) : null}

            {!loading && data ? (
                <div className="rounded-[20px] border border-violet-300/20 bg-[#0b1020]/75 p-2 shadow-[0_0_26px_rgba(139,92,246,0.12)] backdrop-blur-xl">
                    <MatchingIncomeTable dark={dark} variant="super" superData={data} />
                </div>
            ) : null}
        </div>
    );
}

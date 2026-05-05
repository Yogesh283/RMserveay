import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { prepareSanctum } from '../../lib/auth';
import { MatchingIncomeTable } from '../components/MatchingIncomeTable';
import { MemberHeading } from '../components/MemberTypography';

export default function MemberPanelMatchingPage() {
    const { dark } = useOutletContext();
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoadError(null);
        setLoading(true);
        try {
            await prepareSanctum();
            const { data: json } = await window.axios.get('api/member/programme/panel-matching');
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
        <div className="space-y-4">
            <header className="space-y-1">
                <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>RM Survey</p>
                <MemberHeading dark={dark}>Panel Matching Income</MemberHeading>
            </header>

            {loadError ? (
                <div className={`rounded-lg border px-4 py-3 text-sm ${dark ? 'border-red-400/40 bg-red-950/40 text-red-200' : 'border-red-200 bg-red-50 text-red-800'}`}>
                    {loadError}
                </div>
            ) : null}

            {loading && !loadError ? (
                <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Loading…</p>
            ) : null}

            {!loading && data ? <MatchingIncomeTable dark={dark} variant="panel" panelData={data} /> : null}
        </div>
    );
}

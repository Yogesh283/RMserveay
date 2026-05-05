import PageShell from '../components/PageShell';

export default function WhyJoinPage() {
    return (
        <PageShell title="Why join us" eyebrow="Community">
            <p>
                Join a growing network of contributors and partners. Share feedback on your schedule and access updates via our
                bulletin and announcements — all inside one cohesive interface.
            </p>
            <h2>Benefits</h2>
            <ul>
                <li>Transparent participation flows</li>
                <li>Regular updates and educational sessions</li>
                <li>Support when you need it</li>
            </ul>
            <p className="text-slate-400">Same navigation and footer as every other page — no surprises.</p>
        </PageShell>
    );
}

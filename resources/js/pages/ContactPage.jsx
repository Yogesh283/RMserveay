import PageShell from '../components/PageShell';

export default function ContactPage() {
    return (
        <PageShell title="Contact" eyebrow="Get in touch">
            <p>We read every message. Fields below match the rest of the site styling.</p>
            <form
                className="mt-8 max-w-lg space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                }}
            >
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-300">
                        Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                        placeholder="Your name"
                    />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                        placeholder="you@example.com"
                    />
                </div>
                <div>
                    <label htmlFor="msg" className="block text-sm font-medium text-slate-300">
                        Message
                    </label>
                    <textarea
                        id="msg"
                        rows={4}
                        className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                        placeholder="How can we help?"
                    />
                </div>
                <button
                    type="submit"
                    className="rounded-xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 hover:bg-violet-400"
                >
                    Send message
                </button>
            </form>
        </PageShell>
    );
}

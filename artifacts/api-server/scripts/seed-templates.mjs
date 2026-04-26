// One-shot seed: creates the official `deploybro` user (if missing) and
// inserts three polished, public, admin-featured starter templates.
//
// Idempotent: safe to re-run. If a template already exists for the
// `deploybro` user with the same slug, its files are replaced in-place
// and the row is re-flagged as featured/public.
//
// Usage (from repo root):
//   cd artifacts/api-server && node ./scripts/seed-templates.mjs

import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = process.env.NEON_DATABASE_URL;
if (!DATABASE_URL) {
  console.error("NEON_DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// ---- Shared file factories ---------------------------------------------
const indexHtml = (title) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/@remix-run/router@1/dist/router.umd.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-router@6/dist/umd/react-router.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-router-dom@6/dist/umd/react-router-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react" src="components/Nav.jsx"></script>
  <script type="text/babel" data-presets="react" src="components/Footer.jsx"></script>
  <script type="text/babel" data-presets="react" src="pages/Home.jsx"></script>
  <script type="text/babel" data-presets="react" src="pages/About.jsx"></script>
  <script type="text/babel" data-presets="react" src="pages/Pricing.jsx"></script>
  <script type="text/babel" data-presets="react" src="pages/Contact.jsx"></script>
  <script type="text/babel" data-presets="react" src="app.jsx"></script>
</body>
</html>
`;

const appJsx = `const { BrowserRouter, Routes, Route } = ReactRouterDOM;
function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-page text-ink">
        <Nav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
`;

// ============================================================
// TEMPLATE 1: Bro Cloud — modern SaaS landing
// ============================================================
const broCloud = {
  slug: "bro-cloud-saas",
  name: "Bro Cloud — SaaS Landing",
  description:
    "A polished SaaS landing page in DeployBro's signature dark style — hero, features, pricing, FAQ, and contact. Indigo accents on near-black.",
  framework: "React",
  features: [
    "Multi-page React Router site",
    "Hero with gradient + CTAs",
    "Three-tier pricing with FAQ",
    "About page with values + team",
    "Validated contact form",
    "Dark-mode-first design",
  ],
  coverImageUrl:
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=900&fit=crop&q=80",
  files: {
    "index.html": indexHtml("Bro Cloud — Ship faster"),
    "app.jsx": appJsx.replace("bg-page text-ink", "bg-slate-950 text-slate-100"),
    "components/Nav.jsx": `const { Link, NavLink } = ReactRouterDOM;
function Nav() {
  const link = ({ isActive }) =>
    "px-3 py-1.5 rounded-md text-sm transition " +
    (isActive ? "bg-white/10 text-white" : "text-slate-400 hover:text-white");
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-slate-950/70 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-400 to-violet-600" />
          <span>Bro Cloud</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" end className={link}>Home</NavLink>
          <NavLink to="/pricing" className={link}>Pricing</NavLink>
          <NavLink to="/about" className={link}>About</NavLink>
          <NavLink to="/contact" className={link}>Contact</NavLink>
        </nav>
        <Link to="/contact" className="px-3 py-1.5 rounded-md bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400">
          Start free
        </Link>
      </div>
    </header>
  );
}
`,
    "components/Footer.jsx": `const { Link } = ReactRouterDOM;
function Footer() {
  return (
    <footer className="border-t border-white/10 mt-24">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-6 md:items-center md:justify-between text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-gradient-to-br from-indigo-400 to-violet-600" />
          <span>© {new Date().getFullYear()} Bro Cloud Inc.</span>
        </div>
        <div className="flex gap-6">
          <Link to="/about" className="hover:text-white">About</Link>
          <Link to="/pricing" className="hover:text-white">Pricing</Link>
          <Link to="/contact" className="hover:text-white">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
`,
    "pages/Home.jsx": `const { Link } = ReactRouterDOM;
function Home() {
  const features = [
    { title: "Edge-deployed", body: "Spin up infra in 30 regions with one CLI command." },
    { title: "Zero ops", body: "Logs, metrics, alerts, autoscaling — wired by default." },
    { title: "Cost-aware", body: "Live spend dashboards, not a surprise bill on the 1st." },
    { title: "Open source core", body: "Self-host the same binary we run in production." },
  ];
  const stats = [
    { k: "99.99%", v: "uptime SLA" },
    { k: "<40ms", v: "p99 latency" },
    { k: "30+", v: "regions" },
    { k: "8,400+", v: "teams shipping" },
  ];
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.25),transparent_60%),radial-gradient(circle_at_70%_60%,rgba(139,92,246,0.2),transparent_55%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-28 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono tracking-wide text-slate-300">
            v4.0 — now with edge functions
          </span>
          <h1 className="mt-6 text-5xl md:text-6xl font-semibold tracking-tight leading-tight">
            Ship globally.<br />
            <span className="bg-gradient-to-r from-indigo-300 to-violet-400 bg-clip-text text-transparent">Without the platform team.</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-slate-400 text-lg">
            Bro Cloud gives small teams the deploy, observability, and scaling stack that used to take a 12-person SRE org.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/contact" className="px-5 py-2.5 rounded-md bg-indigo-500 text-white font-medium hover:bg-indigo-400">
              Start free trial
            </Link>
            <Link to="/pricing" className="px-5 py-2.5 rounded-md border border-white/15 text-white hover:bg-white/5">
              See pricing
            </Link>
          </div>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl bg-white/10 overflow-hidden">
          {stats.map((s) => (
            <div key={s.k} className="bg-slate-950 px-6 py-6 text-center">
              <div className="text-2xl font-semibold">{s.k}</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{s.v}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold tracking-tight">Built for teams who ship every day</h2>
          <p className="mt-3 text-slate-400">Everything you need on day one. Nothing you don't.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-400/20 mb-4 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
              </div>
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 p-10 text-center">
          <h3 className="text-2xl font-semibold tracking-tight">Ready in 90 seconds</h3>
          <p className="mt-2 text-slate-400">Free for 30 days. No credit card. Real production traffic.</p>
          <Link to="/contact" className="mt-6 inline-block px-5 py-2.5 rounded-md bg-white text-slate-900 font-medium hover:bg-slate-100">
            Get started
          </Link>
        </div>
      </section>
    </div>
  );
}
`,
    "pages/About.jsx": `function About() {
  const values = [
    { title: "Boring is good", body: "We pick the boring tech that runs at 3am unattended." },
    { title: "Default to open", body: "Public roadmap, public incidents, public source." },
    { title: "Customers ship", body: "If you can't deploy by lunch on day one, we failed." },
  ];
  const team = [
    { name: "Mira Patel", role: "CEO & co-founder" },
    { name: "Jonas Lee", role: "CTO & co-founder" },
    { name: "Aisha Nkosi", role: "Head of Engineering" },
    { name: "Theo Brandt", role: "Head of Design" },
  ];
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <span className="text-xs uppercase tracking-widest text-indigo-400 font-mono">About us</span>
      <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
        We build the cloud we wished we'd had.
      </h1>
      <p className="mt-6 text-slate-400 text-lg leading-relaxed">
        Bro Cloud started in a Berlin basement in 2021 after our founders watched the same three-week "deploy to prod" cycle play out at four companies in a row. We're a remote team of 32 from 11 countries, profitable since 2023, and still moving fast.
      </p>
      <div className="grid sm:grid-cols-3 gap-4 mt-12">
        {values.map((v) => (
          <div key={v.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="font-medium">{v.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{v.body}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-20 text-2xl font-semibold tracking-tight">Leadership</h2>
      <div className="grid sm:grid-cols-2 gap-3 mt-6">
        {team.map((t) => (
          <div key={t.name} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600" />
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-sm text-slate-400">{t.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`,
    "pages/Pricing.jsx": `const { Link } = ReactRouterDOM;
const { useState } = React;
function Pricing() {
  const tiers = [
    { name: "Starter", price: "£0", per: "forever", cta: "Start free", highlight: false,
      features: ["1 project", "Community support", "5GB bandwidth", "Hobby usage"] },
    { name: "Pro", price: "£29", per: "per user / mo", cta: "Start 30-day trial", highlight: true,
      features: ["Unlimited projects", "Priority support", "200GB bandwidth", "Team roles & SSO"] },
    { name: "Scale", price: "£99", per: "per user / mo", cta: "Talk to sales", highlight: false,
      features: ["Everything in Pro", "Dedicated SRE", "Audit logs & SOC2", "99.99% uptime SLA"] },
  ];
  const faqs = [
    { q: "Can I change tier later?", a: "Yes — switch any time. Pro-rated to the day." },
    { q: "Do you offer annual billing?", a: "20% off when billed yearly. Email billing@brocloud.dev." },
    { q: "What counts as a user?", a: "Anyone with deploy or admin permissions on a project." },
    { q: "Is there a free option for OSS?", a: "Open-source projects get Pro features at no cost — just ask." },
  ];
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs uppercase tracking-widest text-indigo-400 font-mono">Pricing</span>
        <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">Simple. Honest. £.</h1>
        <p className="mt-4 text-slate-400">No usage traps. No "contact us for pricing" on the main tier. Cancel any time.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mt-12">
        {tiers.map((t) => (
          <div key={t.name}
            className={"rounded-2xl p-7 border " + (t.highlight ? "border-indigo-400/40 bg-indigo-500/5 ring-1 ring-indigo-400/30" : "border-white/10 bg-white/[0.02]") }>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t.name}</h3>
              {t.highlight && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200 font-mono">Popular</span>}
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-semibold">{t.price}</span>
              <span className="text-sm text-slate-400">{t.per}</span>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-slate-300">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-indigo-400">✓</span>{f}
                </li>
              ))}
            </ul>
            <Link to="/contact" className={"mt-7 block text-center px-4 py-2.5 rounded-md font-medium " + (t.highlight ? "bg-indigo-500 text-white hover:bg-indigo-400" : "border border-white/15 text-white hover:bg-white/5")}>
              {t.cta}
            </Link>
          </div>
        ))}
      </div>
      <div className="max-w-2xl mx-auto mt-20">
        <h2 className="text-2xl font-semibold tracking-tight text-center">Questions, briefly</h2>
        <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
          {faqs.map((f, i) => <FaqRow key={i} q={f.q} a={f.a} />)}
        </div>
      </div>
    </div>
  );
}
function FaqRow({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left">
        <span className="font-medium">{q}</span>
        <span className="text-slate-500">{open ? "−" : "+"}</span>
      </button>
      {open && <p className="mt-2 text-sm text-slate-400">{a}</p>}
    </div>
  );
}
`,
    "pages/Contact.jsx": `const { useState } = React;
function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (!form.email.includes("@") || form.message.length < 5) return;
    setSent(true);
  };
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <span className="text-xs uppercase tracking-widest text-indigo-400 font-mono">Contact</span>
      <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">Talk to a real human.</h1>
      <p className="mt-4 text-slate-400">Sales, partnerships, weird API edge cases — all welcome. We reply within one business day.</p>
      <div className="mt-10 grid md:grid-cols-3 gap-8">
        <aside className="space-y-6 text-sm">
          <div>
            <div className="text-slate-500 uppercase text-[10px] tracking-wider font-mono">Sales</div>
            <a href="mailto:hello@brocloud.dev" className="text-slate-200 hover:text-indigo-300">hello@brocloud.dev</a>
          </div>
          <div>
            <div className="text-slate-500 uppercase text-[10px] tracking-wider font-mono">Support</div>
            <a href="mailto:support@brocloud.dev" className="text-slate-200 hover:text-indigo-300">support@brocloud.dev</a>
          </div>
          <div>
            <div className="text-slate-500 uppercase text-[10px] tracking-wider font-mono">Office</div>
            <p className="text-slate-300">Berlin · London · Remote-first</p>
          </div>
        </aside>
        <form onSubmit={submit} className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
          {sent ? (
            <div className="text-center py-10">
              <div className="text-3xl">✓</div>
              <h3 className="mt-2 font-semibold">Thanks — we'll be in touch.</h3>
              <p className="text-sm text-slate-400 mt-1">A teammate will reply to {form.email} shortly.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-slate-400">Name</label>
                <input value={form.name} onChange={set("name")} required
                  className="mt-1 w-full rounded-md bg-slate-900 border border-white/10 px-3 py-2 outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Work email</label>
                <input value={form.email} onChange={set("email")} type="email" required
                  className="mt-1 w-full rounded-md bg-slate-900 border border-white/10 px-3 py-2 outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400">How can we help?</label>
                <textarea value={form.message} onChange={set("message")} rows={5} required
                  className="mt-1 w-full rounded-md bg-slate-900 border border-white/10 px-3 py-2 outline-none focus:border-indigo-400" />
              </div>
              <button className="px-5 py-2.5 rounded-md bg-indigo-500 text-white font-medium hover:bg-indigo-400">
                Send message
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
`,
  },
};

// ============================================================
// TEMPLATE 2: Studio Bro — creative agency
// ============================================================
const studioBro = {
  slug: "studio-bro-agency",
  name: "Studio Bro — Creative Agency",
  description:
    "An editorial-style site for design studios and freelance creatives. Warm cream paper, ink-black serif headlines, and a featured-work grid.",
  framework: "React",
  features: [
    "Editorial serif design system",
    "Featured work showcase grid",
    "Three engagement-model pricing",
    "Process + values storytelling",
    "Project brief contact form",
    "Cream-on-ink colour palette",
  ],
  coverImageUrl:
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=900&fit=crop&q=80",
  files: {
    "index.html": indexHtml("Studio Bro — Brand & product design"),
    "app.jsx": appJsx.replace("bg-page text-ink", "bg-stone-50 text-stone-900").replace("font-sans", "font-serif"),
    "components/Nav.jsx": `const { Link, NavLink } = ReactRouterDOM;
function Nav() {
  const link = ({ isActive }) =>
    "px-2 py-1 text-sm tracking-wide transition " +
    (isActive ? "text-stone-900" : "text-stone-500 hover:text-stone-900");
  return (
    <header className="border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-serif text-xl tracking-tight">
          Studio<span className="italic">Bro</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 uppercase font-mono text-[11px]">
          <NavLink to="/" end className={link}>Work</NavLink>
          <NavLink to="/about" className={link}>Studio</NavLink>
          <NavLink to="/pricing" className={link}>Engage</NavLink>
          <NavLink to="/contact" className={link}>Brief us</NavLink>
        </nav>
        <Link to="/contact" className="px-4 py-2 rounded-full bg-stone-900 text-stone-50 text-xs uppercase tracking-wider hover:bg-stone-700">
          Start a project
        </Link>
      </div>
    </header>
  );
}
`,
    "components/Footer.jsx": `const { Link } = ReactRouterDOM;
function Footer() {
  return (
    <footer className="border-t border-stone-200 mt-20 bg-stone-100">
      <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-4 gap-6 text-sm">
        <div>
          <div className="font-serif text-lg">Studio<span className="italic">Bro</span></div>
          <p className="mt-2 text-stone-500 leading-relaxed">A small studio shaping bold brands and useful product.</p>
        </div>
        <div>
          <div className="text-[11px] uppercase font-mono text-stone-500 tracking-wider mb-2">Studio</div>
          <ul className="space-y-1.5">
            <li><Link to="/about" className="hover:underline">About</Link></li>
            <li><Link to="/pricing" className="hover:underline">Engagements</Link></li>
            <li><Link to="/contact" className="hover:underline">Contact</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-[11px] uppercase font-mono text-stone-500 tracking-wider mb-2">London</div>
          <p className="text-stone-600 leading-relaxed">14 Redchurch Street<br/>London E2 7DJ</p>
        </div>
        <div>
          <div className="text-[11px] uppercase font-mono text-stone-500 tracking-wider mb-2">Hello</div>
          <a href="mailto:hello@studiobro.co" className="text-stone-700 hover:underline">hello@studiobro.co</a>
        </div>
      </div>
      <div className="border-t border-stone-200 text-xs text-stone-500 text-center py-4">
        © {new Date().getFullYear()} Studio Bro Ltd. Made on a slow morning.
      </div>
    </footer>
  );
}
`,
    "pages/Home.jsx": `const { Link } = ReactRouterDOM;
function Home() {
  const services = [
    { title: "Brand identity", body: "Naming, logo, type, voice — the full system." },
    { title: "Digital product", body: "Web apps and mobile interfaces that feel inevitable." },
    { title: "Editorial & print", body: "Books, reports, packaging — work that lives in hands." },
  ];
  const work = [
    { title: "Folio Library", tag: "Brand · 2025", color: "from-amber-200 to-rose-300" },
    { title: "Greenhouse OS", tag: "Product · 2025", color: "from-emerald-200 to-teal-300" },
    { title: "Atlas Atlas", tag: "Editorial · 2024", color: "from-indigo-200 to-violet-300" },
    { title: "Kettle & Co.", tag: "Brand · 2024", color: "from-orange-200 to-pink-300" },
  ];
  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="text-[11px] uppercase font-mono tracking-widest text-stone-500">Independent design studio · est. 2017</div>
        <h1 className="mt-6 font-serif text-5xl md:text-7xl leading-[1.05] tracking-tight max-w-4xl">
          We help ambitious teams look <span className="italic">unmistakable</span> — and feel deeply useful.
        </h1>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/contact" className="px-5 py-3 rounded-full bg-stone-900 text-stone-50 text-sm hover:bg-stone-700">
            Start a project →
          </Link>
          <Link to="/about" className="px-5 py-3 rounded-full border border-stone-300 text-sm hover:bg-stone-100">
            How we work
          </Link>
        </div>
      </section>
      <section className="border-y border-stone-200 bg-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8">
          {services.map((s) => (
            <div key={s.title}>
              <div className="text-[11px] uppercase font-mono tracking-widest text-stone-500">Service</div>
              <h3 className="mt-2 font-serif text-2xl">{s.title}</h3>
              <p className="mt-2 text-stone-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-8">
          <h2 className="font-serif text-3xl tracking-tight">Selected work</h2>
          <Link to="/contact" className="text-sm uppercase font-mono tracking-wider hover:underline">All projects →</Link>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {work.map((w) => (
            <a key={w.title} href="#" className="group">
              <div className={"aspect-[4/3] rounded-lg bg-gradient-to-br " + w.color + " mb-3 transition group-hover:scale-[1.01]"} />
              <div className="flex items-baseline justify-between">
                <h3 className="font-serif text-xl">{w.title}</h3>
                <span className="text-[11px] uppercase font-mono text-stone-500">{w.tag}</span>
              </div>
            </a>
          ))}
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="font-serif text-2xl md:text-3xl leading-snug text-stone-700">
          "They redrew our brand in six weeks and revenue followed within the quarter. Worth every penny."
        </p>
        <div className="mt-6 text-[11px] uppercase font-mono tracking-widest text-stone-500">
          Hana Kobayashi — CEO, Folio Library
        </div>
      </section>
    </div>
  );
}
`,
    "pages/About.jsx": `function About() {
  const team = [
    { name: "Sasha Reed", role: "Creative director" },
    { name: "Owen Marsh", role: "Design lead" },
    { name: "Petra Volk", role: "Producer" },
    { name: "Yuki Tanaka", role: "Engineer-in-residence" },
  ];
  const process = [
    { step: "01", title: "Listen", body: "Two weeks of conversations, audits, and uncomfortable questions." },
    { step: "02", title: "Frame", body: "We collapse the project to a single sentence everyone agrees with." },
    { step: "03", title: "Make", body: "Three weekly check-ins. No PDF cliffhangers." },
    { step: "04", title: "Ship", body: "We hand over assets, code, and a handbook your team can run with." },
  ];
  return (
    <div>
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12">
        <div className="text-[11px] uppercase font-mono tracking-widest text-stone-500">About</div>
        <h1 className="mt-4 font-serif text-4xl md:text-6xl leading-tight">
          Eight people, a quiet mews studio in Shoreditch, and a strong opinion that design should be useful first and beautiful second.
        </h1>
      </section>
      <section className="bg-stone-100 border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12">
          {process.map((p) => (
            <div key={p.step} className="flex gap-6">
              <div className="font-mono text-stone-400 text-sm pt-2">{p.step}</div>
              <div>
                <h3 className="font-serif text-2xl">{p.title}</h3>
                <p className="mt-2 text-stone-600 leading-relaxed">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-serif text-3xl">The team</h2>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {team.map((t) => (
            <div key={t.name}>
              <div className="aspect-square rounded-lg bg-gradient-to-br from-stone-200 to-stone-300" />
              <div className="mt-3 font-serif text-lg">{t.name}</div>
              <div className="text-sm text-stone-500">{t.role}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
`,
    "pages/Pricing.jsx": `const { Link } = ReactRouterDOM;
function Pricing() {
  const tiers = [
    {
      name: "Sprint",
      price: "£4,500",
      per: "two-week engagement",
      desc: "A focused sprint to ship one thing — landing page, brand refresh, design audit.",
      bullets: ["1 senior designer", "Daily standup", "All source files", "One round of revisions"],
    },
    {
      name: "Retainer",
      price: "£8,000",
      per: "per month",
      desc: "Embedded studio time for teams who keep shipping. Three-month minimum.",
      bullets: ["Two senior designers", "Weekly delivery", "Slack + roadmap access", "Quarterly strategy review"],
      highlight: true,
    },
    {
      name: "Full project",
      price: "From £35k",
      per: "fixed scope",
      desc: "Whole-brand or whole-product engagements. We'll write you a proper proposal.",
      bullets: ["Full team allocation", "Research + strategy", "Design + handoff", "Post-launch care"],
    },
  ];
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <div className="text-[11px] uppercase font-mono tracking-widest text-stone-500">Engagements</div>
      <h1 className="mt-4 font-serif text-4xl md:text-5xl tracking-tight">Three ways to work with us.</h1>
      <p className="mt-3 text-stone-600 max-w-xl">All prices in pounds. We bill weekly. No surprise change orders — if scope shifts, we agree on a number first.</p>
      <div className="grid md:grid-cols-3 gap-6 mt-12">
        {tiers.map((t) => (
          <div key={t.name} className={"rounded-2xl border p-7 " + (t.highlight ? "border-stone-900 bg-white shadow-lg" : "border-stone-200 bg-white")}>
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl">{t.name}</h3>
              {t.highlight && <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-stone-900 text-stone-50">Most teams</span>}
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-serif">{t.price}</span>
              <span className="text-xs text-stone-500">{t.per}</span>
            </div>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed">{t.desc}</p>
            <ul className="mt-6 space-y-2 text-sm text-stone-700">
              {t.bullets.map((b) => (
                <li key={b} className="flex gap-2"><span className="text-stone-400">·</span>{b}</li>
              ))}
            </ul>
            <Link to="/contact" className={"mt-7 block text-center px-4 py-2.5 rounded-full text-sm uppercase tracking-wider " + (t.highlight ? "bg-stone-900 text-stone-50 hover:bg-stone-700" : "border border-stone-300 hover:bg-stone-100")}>
              Enquire
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
`,
    "pages/Contact.jsx": `const { useState } = React;
function Contact() {
  const [form, setForm] = useState({ name: "", company: "", email: "", budget: "£10–25k", brief: "" });
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (!form.email.includes("@") || form.brief.length < 10) return;
    setSent(true);
  };
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <div className="text-[11px] uppercase font-mono tracking-widest text-stone-500">Brief us</div>
      <h1 className="mt-4 font-serif text-4xl md:text-5xl tracking-tight">Tell us about the project.</h1>
      <p className="mt-3 text-stone-600">We read every brief personally and reply in two working days.</p>
      <form onSubmit={submit} className="mt-10 space-y-5 bg-white border border-stone-200 rounded-2xl p-6">
        {sent ? (
          <div className="text-center py-12">
            <div className="font-serif text-3xl">Thank you, {form.name || "friend"}.</div>
            <p className="mt-2 text-stone-600">We'll reply to {form.email} within two working days.</p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase font-mono text-stone-500 tracking-wider">Your name</label>
                <input value={form.name} onChange={set("name")} required className="mt-1 w-full border-b border-stone-300 bg-transparent py-2 outline-none focus:border-stone-900" />
              </div>
              <div>
                <label className="text-xs uppercase font-mono text-stone-500 tracking-wider">Company</label>
                <input value={form.company} onChange={set("company")} className="mt-1 w-full border-b border-stone-300 bg-transparent py-2 outline-none focus:border-stone-900" />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase font-mono text-stone-500 tracking-wider">Email</label>
              <input value={form.email} onChange={set("email")} type="email" required className="mt-1 w-full border-b border-stone-300 bg-transparent py-2 outline-none focus:border-stone-900" />
            </div>
            <div>
              <label className="text-xs uppercase font-mono text-stone-500 tracking-wider">Budget range</label>
              <select value={form.budget} onChange={set("budget")} className="mt-1 w-full border-b border-stone-300 bg-transparent py-2 outline-none focus:border-stone-900">
                <option>£5–10k</option>
                <option>£10–25k</option>
                <option>£25–50k</option>
                <option>£50k+</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase font-mono text-stone-500 tracking-wider">Tell us about it</label>
              <textarea value={form.brief} onChange={set("brief")} rows={6} required className="mt-1 w-full border border-stone-300 rounded-md bg-transparent p-3 outline-none focus:border-stone-900" />
            </div>
            <button className="px-6 py-3 rounded-full bg-stone-900 text-stone-50 text-sm uppercase tracking-wider hover:bg-stone-700">
              Send brief →
            </button>
          </>
        )}
      </form>
    </div>
  );
}
`,
  },
};

// ============================================================
// TEMPLATE 3: Bro Folio — personal portfolio
// ============================================================
const broFolio = {
  slug: "bro-folio-portfolio",
  name: "Bro Folio — Personal Portfolio",
  description:
    "A minimal monochrome portfolio for developers and designers. Lime accent, clean grid, project showcase, and a clear day-rate page.",
  framework: "React",
  features: [
    "Minimal monochrome design",
    "Featured projects grid",
    "Skills + journey timeline",
    "Day-rate pricing page",
    "Availability indicator",
    "Lightweight contact form",
  ],
  coverImageUrl:
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=900&fit=crop&q=80",
  files: {
    "index.html": indexHtml("Bro Folio — Independent designer & developer"),
    "app.jsx": appJsx.replace("bg-page text-ink", "bg-zinc-50 text-zinc-900"),
    "components/Nav.jsx": `const { Link, NavLink } = ReactRouterDOM;
function Nav() {
  const link = ({ isActive }) =>
    "text-sm transition " + (isActive ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-900");
  return (
    <header className="border-b border-zinc-200">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-mono text-sm">
          <span className="w-2 h-2 rounded-full bg-lime-400" />
          alex.dev
        </Link>
        <nav className="flex items-center gap-6">
          <NavLink to="/" end className={link}>Work</NavLink>
          <NavLink to="/about" className={link}>About</NavLink>
          <NavLink to="/pricing" className={link}>Rates</NavLink>
          <NavLink to="/contact" className={link}>Contact</NavLink>
        </nav>
      </div>
    </header>
  );
}
`,
    "components/Footer.jsx": `function Footer() {
  return (
    <footer className="border-t border-zinc-200 mt-20">
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between text-xs font-mono text-zinc-500">
        <div>© {new Date().getFullYear()} Alex Doe — built by hand.</div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-zinc-900">github</a>
          <a href="#" className="hover:text-zinc-900">linkedin</a>
          <a href="#" className="hover:text-zinc-900">twitter</a>
          <a href="#" className="hover:text-zinc-900">read.cv</a>
        </div>
      </div>
    </footer>
  );
}
`,
    "pages/Home.jsx": `const { Link } = ReactRouterDOM;
function Home() {
  const projects = [
    { name: "Tablo", tag: "2025 · Product design + Next.js", body: "A spreadsheet built for product managers who hate spreadsheets. Hit £1M ARR in eight months." },
    { name: "Loop CLI", tag: "2024 · Open source · Rust", body: "A 20-line install that turned a customer's deploy from 14 minutes into 80 seconds. 4.2k stars." },
    { name: "Mira Studio", tag: "2024 · Brand + Marketing site", body: "Identity, site, and conversion-tuned signup flow for a Berlin design studio." },
    { name: "Hush", tag: "2023 · iOS app · SwiftUI", body: "A meditation app with no streaks, no subscriptions, no notifications. Sometimes less wins." },
  ];
  const stack = ["TypeScript", "React", "Next.js", "Postgres", "Tailwind", "Figma", "Swift", "Rust"];
  return (
    <div>
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-12">
        <div className="flex items-center gap-2 text-xs font-mono text-lime-700">
          <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" />
          Available for work · January 2026
        </div>
        <h1 className="mt-6 text-4xl md:text-5xl font-medium tracking-tight leading-tight">
          Independent designer & developer building thoughtful product — for early-stage teams in Europe.
        </h1>
        <p className="mt-6 text-zinc-600 text-lg leading-relaxed">
          Eight years across Berlin, London, and Lisbon. Clients include three Series A startups and the occasional government department.
        </p>
        <div className="mt-6 flex gap-3">
          <Link to="/contact" className="px-4 py-2 rounded-md bg-zinc-900 text-zinc-50 text-sm hover:bg-zinc-700">Get in touch</Link>
          <Link to="/pricing" className="px-4 py-2 rounded-md border border-zinc-300 text-sm hover:bg-zinc-100">See rates</Link>
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-6">Selected work</div>
        <div className="space-y-8">
          {projects.map((p) => (
            <article key={p.name} className="group border-t border-zinc-200 pt-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-medium group-hover:text-lime-700 transition">{p.name}</h2>
                <span className="text-xs font-mono text-zinc-500">{p.tag}</span>
              </div>
              <p className="mt-2 text-zinc-600 leading-relaxed">{p.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">Tech I reach for</div>
        <div className="flex flex-wrap gap-2">
          {stack.map((s) => (
            <span key={s} className="px-2.5 py-1 rounded-full border border-zinc-300 text-xs font-mono text-zinc-700">{s}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
`,
    "pages/About.jsx": `function About() {
  const journey = [
    { year: "2024 — now", body: "Independent. Working with three startups on product + brand." },
    { year: "2021 — 2024", body: "Design lead at Tablo (Berlin). Took us from 4 to 28 people." },
    { year: "2018 — 2021", body: "Senior designer at Mira (London). Shipped 12 product launches." },
    { year: "2016 — 2018", body: "Engineer at a small fintech in Lisbon. Learned what bad design costs." },
  ];
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">About</div>
      <h1 className="mt-3 text-3xl md:text-4xl font-medium tracking-tight">A short bio.</h1>
      <div className="mt-8 space-y-5 text-zinc-700 leading-relaxed">
        <p>I'm Alex — a designer and developer working independently from Lisbon. I help early-stage teams ship product that feels considered, both visually and in the details users only notice on the second use.</p>
        <p>Before going independent I led design at Tablo, a Berlin productivity startup, and shipped product at Mira in London. I write the occasional open-source library and contribute to a couple of small Rust projects in the evenings.</p>
        <p>When I'm not at a screen I'm climbing, cooking something slow, or trying to convince a friend to start a podcast.</p>
      </div>
      <h2 className="mt-16 text-xs font-mono uppercase tracking-widest text-zinc-500">Journey</h2>
      <div className="mt-4 space-y-3">
        {journey.map((j) => (
          <div key={j.year} className="flex gap-6 border-t border-zinc-200 pt-3">
            <div className="font-mono text-xs text-zinc-500 w-32 shrink-0 pt-0.5">{j.year}</div>
            <div className="text-zinc-700">{j.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
`,
    "pages/Pricing.jsx": `const { Link } = ReactRouterDOM;
function Pricing() {
  const tiers = [
    {
      name: "By the day",
      price: "£950",
      per: "per day",
      desc: "Best for short engagements, design audits, or pairing with your team for a week.",
      bullets: ["Min. 2-day booking", "Async + sync as needed", "All source files", "Invoiced weekly"],
    },
    {
      name: "Monthly",
      price: "£11,000",
      per: "per month",
      desc: "Embedded with your team for a quarter. The way I do my best work.",
      bullets: ["~16 days / month", "Standing weekly review", "Strategy + delivery", "Three-month min."],
      highlight: true,
    },
    {
      name: "Project",
      price: "Custom",
      per: "fixed-scope",
      desc: "We agree on a deliverable up front and a price for getting it shipped.",
      bullets: ["Scope written together", "Milestone-based billing", "Capped revisions", "Single point of accountability"],
    },
  ];
  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Rates</div>
      <h1 className="mt-3 text-3xl md:text-4xl font-medium tracking-tight">Three ways to hire me.</h1>
      <p className="mt-3 text-zinc-600 max-w-xl">Prices in pounds. Travel and venue costs separate. Open-source projects always negotiable.</p>
      <div className="grid md:grid-cols-3 gap-4 mt-12">
        {tiers.map((t) => (
          <div key={t.name} className={"rounded-xl p-6 " + (t.highlight ? "bg-zinc-900 text-zinc-50 ring-2 ring-lime-400" : "bg-white border border-zinc-200")}>
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{t.name}</h3>
              {t.highlight && <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-lime-400 text-zinc-900">Recommended</span>}
            </div>
            <div className={"mt-4 flex items-baseline gap-2 " + (t.highlight ? "text-zinc-50" : "text-zinc-900")}>
              <span className="text-3xl font-medium">{t.price}</span>
              <span className={"text-xs " + (t.highlight ? "text-zinc-400" : "text-zinc-500")}>{t.per}</span>
            </div>
            <p className={"mt-3 text-sm leading-relaxed " + (t.highlight ? "text-zinc-300" : "text-zinc-600")}>{t.desc}</p>
            <ul className={"mt-5 space-y-1.5 text-sm " + (t.highlight ? "text-zinc-200" : "text-zinc-700")}>
              {t.bullets.map((b) => (
                <li key={b} className="flex gap-2"><span className={t.highlight ? "text-lime-400" : "text-zinc-400"}>·</span>{b}</li>
              ))}
            </ul>
            <Link to="/contact" className={"mt-6 block text-center px-4 py-2 rounded-md text-sm " + (t.highlight ? "bg-lime-400 text-zinc-900 hover:bg-lime-300" : "border border-zinc-300 text-zinc-900 hover:bg-zinc-100")}>
              Get in touch
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-10 text-sm font-mono text-zinc-500">
        Currently booking from January 2026 onwards. Two slots remain in the new year — happy to chat sooner.
      </p>
    </div>
  );
}
`,
    "pages/Contact.jsx": `const { useState } = React;
function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (!form.email.includes("@") || form.message.length < 10) return;
    setSent(true);
  };
  return (
    <div className="max-w-2xl mx-auto px-6 py-20">
      <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Contact</div>
      <h1 className="mt-3 text-3xl md:text-4xl font-medium tracking-tight">Say hi.</h1>
      <p className="mt-3 text-zinc-600">
        The fastest path is email — <a className="underline hover:text-lime-700" href="mailto:hello@alex.dev">hello@alex.dev</a> — but the form below works too.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {sent ? (
          <div className="rounded-lg border border-lime-400 bg-lime-50 p-6">
            <div className="font-medium">Got it — thanks {form.name || "friend"}.</div>
            <p className="mt-1 text-sm text-zinc-600">I'll reply to {form.email} within a day or two.</p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Name</label>
              <input value={form.name} onChange={set("name")} required className="mt-1 w-full border-b border-zinc-300 bg-transparent py-2 outline-none focus:border-lime-500" />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Email</label>
              <input value={form.email} onChange={set("email")} type="email" required className="mt-1 w-full border-b border-zinc-300 bg-transparent py-2 outline-none focus:border-lime-500" />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Message</label>
              <textarea value={form.message} onChange={set("message")} rows={6} required className="mt-1 w-full border border-zinc-300 rounded-md bg-transparent p-3 outline-none focus:border-lime-500" />
            </div>
            <button className="px-5 py-2 rounded-md bg-zinc-900 text-zinc-50 text-sm hover:bg-zinc-700">
              Send →
            </button>
          </>
        )}
      </form>
    </div>
  );
}
`,
  },
};

const TEMPLATES = [broCloud, studioBro, broFolio];

// ---- Seed -------------------------------------------------------------
async function ensureUser(client) {
  const existing = await client.query(
    "SELECT id FROM users WHERE username = $1 LIMIT 1",
    ["deploybro"],
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const inserted = await client.query(
    `INSERT INTO users (username, display_name, email, bio, avatar_url, plan, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      "deploybro",
      "DeployBro",
      "templates@deploybro.com",
      "The official DeployBro account — home of curated starter templates.",
      null,
      "Pro",
      "active",
    ],
  );
  console.log(`Created deploybro user: ${inserted.rows[0].id}`);
  return inserted.rows[0].id;
}

async function upsertTemplate(client, userId, tmpl) {
  // Either reuse the existing project row (so the public URL doesn't
  // change) or insert a fresh one. Either way, the file set is replaced
  // entirely so re-running the seed picks up content edits.
  const existing = await client.query(
    "SELECT id FROM projects WHERE user_id = $1 AND slug = $2 LIMIT 1",
    [userId, tmpl.slug],
  );

  let projectId;
  if (existing.rows.length > 0) {
    projectId = existing.rows[0].id;
    await client.query(
      `UPDATE projects
         SET name = $2, description = $3, framework = $4,
             is_public = TRUE, is_featured_template = TRUE,
             features = $5, cover_image_url = $6,
             last_built_at = now()
       WHERE id = $1`,
      [
        projectId,
        tmpl.name,
        tmpl.description,
        tmpl.framework,
        tmpl.features,
        tmpl.coverImageUrl,
      ],
    );
    await client.query("DELETE FROM project_files WHERE project_id = $1", [
      projectId,
    ]);
    console.log(`Updated existing template: ${tmpl.slug} (${projectId})`);
  } else {
    const inserted = await client.query(
      `INSERT INTO projects
         (user_id, name, slug, description, framework, status, is_public,
          is_featured_template, features, cover_image_url)
       VALUES ($1, $2, $3, $4, $5, 'live', TRUE, TRUE, $6, $7)
       RETURNING id`,
      [
        userId,
        tmpl.name,
        tmpl.slug,
        tmpl.description,
        tmpl.framework,
        tmpl.features,
        tmpl.coverImageUrl,
      ],
    );
    projectId = inserted.rows[0].id;
    console.log(`Created template: ${tmpl.slug} (${projectId})`);
  }

  // Insert all files. `size` reflects raw UTF-8 byte length to match
  // what the API would store on a normal upload.
  for (const [path, content] of Object.entries(tmpl.files)) {
    const size = Buffer.byteLength(content, "utf8");
    const contentType =
      path.endsWith(".html") ? "text/html"
      : path.endsWith(".jsx") || path.endsWith(".js") ? "text/javascript"
      : path.endsWith(".css") ? "text/css"
      : path.endsWith(".json") ? "application/json"
      : "text/plain";
    await client.query(
      `INSERT INTO project_files (project_id, path, content, encoding, content_type, size)
       VALUES ($1, $2, $3, 'utf8', $4, $5)`,
      [projectId, path, content, contentType, size],
    );
  }
  console.log(`  → ${Object.keys(tmpl.files).length} files`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userId = await ensureUser(client);
    for (const t of TEMPLATES) {
      await upsertTemplate(client, userId, t);
    }
    await client.query("COMMIT");
    console.log("\nSeed complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

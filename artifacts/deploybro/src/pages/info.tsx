import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  GitCommit,
  LayoutTemplate,
  Activity as ActivityIcon,
  Building2,
  Briefcase,
  Lock,
  Scale,
  Compass,
  ShieldAlert,
  Cookie,
  FileLock2,
  CheckCircle2,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { Button } from "@/components/ui/button";

const MARKETING_LINKS = [
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/how-it-works", label: "How it works", icon: LayoutTemplate },
  { href: "/changelog", label: "Changelog", icon: GitCommit },
  { href: "/status", label: "Status", icon: ActivityIcon },
  { href: "/about", label: "About", icon: Building2 },
  { href: "/careers", label: "Careers", icon: Briefcase },
  { href: "/privacy", label: "Privacy", icon: Lock },
  { href: "/terms", label: "Terms", icon: Scale },
  { href: "/aup", label: "Acceptable use", icon: ShieldAlert },
  { href: "/cookies", label: "Cookies", icon: Cookie },
  { href: "/dpa", label: "Data processing", icon: FileLock2 },
];

export function SideNav() {
  const [loc] = useLocation();
  return (
    <nav className="lg:sticky lg:top-24 lg:self-start space-y-1 text-sm">
      <div className="text-[10px] uppercase tracking-wider font-mono text-secondary px-3 py-2">
        Resources
      </div>
      {MARKETING_LINKS.map(({ href, label, icon: Icon }) => {
        const active = loc === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
              active
                ? "bg-primary/15 text-primary border border-primary/25"
                : "text-secondary hover:text-foreground hover:bg-surface"
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Shell({
  eyebrow,
  title,
  intro,
  children,
  prose = false,
  headerActions,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
  prose?: boolean;
  headerActions?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />
      <main className="flex-1">
        <div className="px-4 sm:px-8 max-w-7xl mx-auto w-full pt-12 pb-24 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10 lg:gap-14">
          <aside className="hidden lg:block">
            <SideNav />
          </aside>
          <div className="min-w-0">
            <header className="mb-10 pb-8 border-b border-border">
              {eyebrow && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-5 backdrop-blur-md bg-foreground/[0.04] dark:bg-foreground/[0.06] border border-border/80 text-foreground/80 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {eyebrow}
                </div>
              )}
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="min-w-0">
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                    {title}
                  </h1>
                  {intro && (
                    <p className="text-lg text-secondary max-w-2xl">{intro}</p>
                  )}
                </div>
                {headerActions && (
                  <div className="shrink-0">{headerActions}</div>
                )}
              </div>
            </header>
            <div className={prose ? "max-w-3xl" : ""}>{children}</div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold mb-3 tracking-tight">{title}</h2>
      <div className="text-secondary leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export function CTA() {
  return (
    <div className="mt-12 rounded-xl border border-border bg-surface p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-bold mb-1">Got an idea? Build it now.</h3>
        <p className="text-sm text-secondary">Free to start. No card required.</p>
      </div>
      <Link href="/login">
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          Start building <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </div>
  );
}

const LEGAL_EFFECTIVE = "April 1, 2026";

function LegalMeta({ effective = LEGAL_EFFECTIVE }: { effective?: string }) {
  return (
    <div className="mb-10 rounded-lg border border-border bg-surface/60 p-4 text-xs font-mono text-secondary flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
      <span>Effective: {effective}</span>
      <span className="hidden sm:inline">·</span>
      <span>Version 2.0</span>
      <span className="hidden sm:inline">·</span>
      <span>Governing law: England &amp; Wales</span>
    </div>
  );
}

/* ------------------------------- Pages ------------------------------- */

export function HowItWorks() {
  return (
    <Shell
      eyebrow="How it works"
      title="How DeployBro works"
      intro="A simple path from prompt to published app."
    >
      <div className="space-y-6">
        {[
          ["Describe the app", "Tell DeployBro what you want in plain English."],
          ["Watch it build", "The editor, preview, and data layer appear together."],
          ["Publish it", "DeployBro provisions everything and gives you a live URL."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl border border-border bg-surface p-6">
            <h3 className="font-bold mb-2">{title}</h3>
            <p className="text-secondary">{body}</p>
          </div>
        ))}
      </div>
      <CTA />
    </Shell>
  );
}

export function Changelog() {
  const entries = [
    {
      date: "April 27, 2026",
      version: "v2.0",
      items: [
        "Auto-screenshots for every published project on Explore and the homepage.",
        "Public/private visibility toggle on dashboard project cards.",
        "Full-width dashboard pages and a tighter Resources sidebar.",
      ],
    },
    {
      date: "April 12, 2026",
      version: "v1.9",
      items: [
        "Affiliate earnings dashboard with payouts in £.",
        "One-click publish to deploybro.app subdomains with Postgres provisioned.",
      ],
    },
    {
      date: "March 28, 2026",
      version: "v1.8",
      items: [
        "Builder navigation refresh with sticky preview toolbar.",
        "Anthropic Claude Sonnet upgraded for faster first turn.",
      ],
    },
  ];
  return (
    <Shell
      eyebrow="Changelog"
      title="What's new"
      intro="Recent updates to the DeployBro builder, runtime, and dashboard."
    >
      <div className="space-y-8">
        {entries.map((e) => (
          <div key={e.version} className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-sm font-mono text-primary">{e.version}</span>
              <span className="text-xs text-secondary">{e.date}</span>
            </div>
            <ul className="space-y-2 text-sm text-secondary">
              {e.items.map((it) => (
                <li key={it} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function Status() {
  const services = [
    { name: "Builder API", status: "Operational" },
    { name: "AI generation", status: "Operational" },
    { name: "Deployments", status: "Operational" },
    { name: "Database provisioning", status: "Operational" },
    { name: "Web app", status: "Operational" },
  ];
  return (
    <Shell
      eyebrow="Status"
      title="System status"
      intro="Real-time health of the DeployBro platform."
    >
      <div className="rounded-xl border border-border bg-surface p-6 mb-8 flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
        <span className="font-medium">All systems operational</span>
      </div>
      <div className="rounded-xl border border-border bg-surface divide-y divide-border">
        {services.map((s) => (
          <div key={s.name} className="px-6 py-4 flex items-center justify-between">
            <span className="text-sm">{s.name}</span>
            <span className="inline-flex items-center gap-2 text-xs font-mono text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function About() {
  return (
    <Shell
      eyebrow="About"
      title="About DeployBro"
      intro="We help anyone ship real software from a single prompt."
    >
      <Section title="Our mission">
        <p>
          Building software should feel like writing — not configuring. DeployBro
          turns plain English into working apps, complete with auth, a Postgres
          database, and a live URL, so you can spend your time on the idea
          rather than the plumbing.
        </p>
      </Section>
      <Section title="How we got here">
        <p>
          DeployBro started as a weekend experiment in 2025 and grew into a
          full-stack AI builder used by indie hackers, founders, and product
          teams to ship MVPs in hours instead of weeks.
        </p>
      </Section>
      <CTA />
    </Shell>
  );
}

export function Careers() {
  return (
    <Shell
      eyebrow="Careers"
      title="Work with us"
      intro="A small, remote team building tools that turn ideas into shipped products."
    >
      <Section title="What we value">
        <p>
          Taste, speed, and a bias for shipping. We sweat the details so our
          users don't have to.
        </p>
      </Section>
      <Section title="Open roles">
        <p>
          We're not actively hiring right now, but we always want to meet
          thoughtful builders. Drop us a line at{" "}
          <a className="text-primary hover:underline" href="mailto:hello@deploybro.app">
            hello@deploybro.app
          </a>
          .
        </p>
      </Section>
    </Shell>
  );
}

// Legal pages are intentionally written in plain English. They cover
// the substantive areas the UK ICO and EU GDPR expect to see (data
// categories, lawful basis, retention, transfers, rights, contact),
// the consumer-protection points UK shoppers expect (right to cancel,
// price changes, refunds), and the SaaS housekeeping a B2B customer's
// procurement team will look for (subprocessors, security, breach
// notification, governing law). They are NOT a substitute for advice
// from a qualified lawyer — anyone relying on them in a regulated
// context should have their counsel review and adapt the wording.
export function Privacy() {
  return (
    <Shell eyebrow="Privacy" title="Privacy policy" prose>
      <LegalMeta />
      <Section title="Who we are">
        <p>
          DeployBro is operated from the United Kingdom. For the purposes of
          UK GDPR and the Data Protection Act 2018, DeployBro is the data
          controller for the personal data you give us when you use the
          marketing site, sign up for an account, and operate the builder.
          For data your end-users submit to apps you publish on DeployBro, you
          are the controller and DeployBro is your processor — the{" "}
          <Link href="/dpa" className="text-primary hover:underline">
            Data Processing Addendum
          </Link>{" "}
          governs that relationship.
        </p>
      </Section>

      <Section title="What we collect">
        <p>
          <strong className="text-foreground">Information you give us.</strong>{" "}
          Email address, username, display name and (optionally) a profile
          picture when you sign up. The prompts, project files, screenshots
          and uploads you create in the builder. Billing details processed by
          Stripe (we do not store full card numbers).
        </p>
        <p>
          <strong className="text-foreground">Information collected automatically.</strong>{" "}
          IP address, browser and device type, pages visited, features used,
          and approximate location derived from the IP. Usage telemetry from
          the builder (which models you ran, how many tokens you used, error
          rates) so we can bill you correctly and improve reliability.
        </p>
        <p>
          <strong className="text-foreground">Information from third parties.</strong>{" "}
          When you sign in with a third-party identity provider (e.g. Google),
          we receive your email address and basic profile fields you've
          authorised them to share. We never receive your password.
        </p>
      </Section>

      <Section title="How we use it">
        <p>
          To operate the builder, deploy your projects, bill you correctly,
          provide support, send essential service emails, prevent fraud and
          abuse, comply with our legal obligations, and improve the product.
          We do not sell your data and we do not use the contents of your
          prompts or generated code to train our own AI models.
        </p>
      </Section>

      <Section title="Lawful basis (UK / EU)">
        <p>
          We process personal data on the following lawful bases under UK
          GDPR Article 6: <em>contract</em> (to deliver the service you've
          signed up for), <em>legitimate interests</em> (to keep the service
          secure, prevent abuse, and analyse usage in aggregate),{" "}
          <em>legal obligation</em> (e.g. tax records), and <em>consent</em>{" "}
          (for non-essential cookies and marketing emails — you can withdraw
          consent at any time).
        </p>
      </Section>

      <Section title="Sharing & subprocessors">
        <p>
          We share data only with vetted infrastructure providers acting as
          our processors — currently including hosting, database, email
          delivery, payments, error tracking and analytics. The current list
          is in our{" "}
          <Link href="/dpa" className="text-primary hover:underline">
            DPA
          </Link>
          . We will share data with law enforcement only when legally required
          and, where lawful, will notify you first.
        </p>
      </Section>

      <Section title="International transfers">
        <p>
          Some of our subprocessors operate outside the UK and EEA (notably in
          the United States). Where transfers are required, we rely on the
          UK International Data Transfer Agreement, the UK Addendum to the
          EU Standard Contractual Clauses, or an adequacy decision by the UK
          Government, and apply additional safeguards where appropriate.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Account data is kept while your account is active and for up to 30
          days after deletion to allow recovery, after which it is purged.
          Billing records are kept for 7 years to meet UK tax law. Server
          logs are kept for 90 days. Anonymised usage statistics may be kept
          indefinitely.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Under UK and EU GDPR you have the right to access, correct, delete,
          export, restrict and object to processing of your personal data,
          and the right to withdraw consent. You can exercise most of these
          from your account settings, or by emailing{" "}
          <a className="text-primary hover:underline" href="mailto:privacy@deploybro.app">
            privacy@deploybro.app
          </a>
          . We will respond within 30 days. If you're unhappy with our
          response you can complain to the UK Information Commissioner's
          Office (
          <a
            className="text-primary hover:underline"
            href="https://ico.org.uk"
            target="_blank"
            rel="noreferrer"
          >
            ico.org.uk
          </a>
          ) or your local EU data protection authority.
        </p>
      </Section>

      <Section title="Children">
        <p>
          DeployBro is not directed at children under 16 and we don't knowingly
          collect personal data from them. If you believe a child has given us
          their data, please contact us and we'll delete it.
        </p>
      </Section>

      <Section title="Security">
        <p>
          All traffic is encrypted in transit with TLS 1.2+. Stored secrets
          (API keys, database URLs) are encrypted at rest. Access to
          production systems requires SSO, hardware MFA and is restricted to
          the engineers who need it for support. We patch dependencies on a
          regular cadence and maintain a coordinated disclosure programme for
          security researchers — see the{" "}
          <Link href="/aup" className="text-primary hover:underline">
            acceptable use policy
          </Link>
          .
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update this policy as the service evolves. Material changes
          will be flagged by email or a banner in the app at least 14 days
          before they take effect.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy or your data? Email{" "}
          <a className="text-primary hover:underline" href="mailto:privacy@deploybro.app">
            privacy@deploybro.app
          </a>
          .
        </p>
      </Section>
    </Shell>
  );
}

export function Terms() {
  return (
    <Shell eyebrow="Terms" title="Terms of service" prose>
      <LegalMeta />
      <Section title="Agreement">
        <p>
          These terms form a binding agreement between you and DeployBro. By
          creating an account or using the service you agree to be bound by
          them. If you're using DeployBro on behalf of an organisation, you
          confirm you have authority to bind that organisation.
        </p>
      </Section>

      <Section title="Eligibility">
        <p>
          You must be at least 16 years old (or the digital-consent age in
          your country if higher) to use DeployBro. You must not be barred
          from receiving services under UK, EU, US or UN sanctions law.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You're responsible for keeping your sign-in credentials secure and
          for all activity that happens under your account. Tell us
          immediately if you suspect unauthorised access. One human, one
          account — sharing logins is not allowed on individual plans.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          You agree to use DeployBro in line with our{" "}
          <Link href="/aup" className="text-primary hover:underline">
            acceptable use policy
          </Link>
          . Violations may result in content removal, suspension, or
          termination without refund.
        </p>
      </Section>

      <Section title="Your content & ownership">
        <p>
          You own the prompts, files, code and other content you create on
          DeployBro ("your content"). To run the service we need a worldwide,
          royalty-free licence to host, copy, transmit, and display your
          content for the limited purpose of providing DeployBro to you (and
          to anyone you publish to). The licence ends when you delete the
          content, except for backups retained briefly under our retention
          schedule.
        </p>
        <p>
          DeployBro and its branding, software, and documentation remain our
          intellectual property. Nothing in these terms transfers any
          ownership of DeployBro itself to you.
        </p>
      </Section>

      <Section title="AI-generated output">
        <p>
          DeployBro uses third-party AI models (currently Anthropic Claude) to
          generate code, copy and other artefacts in response to your
          prompts. Output may be inaccurate, insecure or incomplete; you are
          responsible for reviewing it before relying on or publishing it.
          As far as the law allows, we make no warranty that AI output is fit
          for any particular purpose, free of bugs, or non-infringing.
        </p>
      </Section>

      <Section title="Service availability">
        <p>
          We aim to keep DeployBro highly available but we don't promise an
          uptime SLA on free or self-serve paid plans. Scheduled maintenance
          will be announced in advance where possible. Status updates are
          posted at{" "}
          <Link href="/status" className="text-primary hover:underline">
            /status
          </Link>
          .
        </p>
      </Section>

      <Section title="Plans & billing">
        <p>
          Paid plans are billed in £ Sterling on a recurring basis (monthly
          or annual, as you choose) until you cancel. Subscriptions auto-renew
          for another period unless cancelled at least one day before the
          renewal date. You can cancel any time from the billing page;
          cancellation takes effect at the end of your current period.
        </p>
        <p>
          Prices include UK VAT where applicable. We may change prices on
          renewal with at least 30 days' email notice — if you don't accept
          the new price you can cancel before it takes effect.
        </p>
      </Section>

      <Section title="Refunds & UK consumer rights">
        <p>
          If you're a UK or EU consumer and signed up online, you have a 14
          day cooling-off period to cancel for a full refund — but you waive
          that right when you start actively using the service (e.g. running
          a build, publishing a project), as the service is then "fully
          performed". After the cooling-off period subscriptions are
          generally non-refundable, but we'll consider pro-rata refunds for
          extended outages or billing errors at our discretion.
        </p>
      </Section>

      <Section title="Suspension & termination">
        <p>
          We may suspend or terminate your account if you breach these terms
          or the AUP, fail to pay, or use the service in a way that risks
          harm to us or others. You may close your account at any time from
          settings; doing so does not entitle you to a refund of pre-paid
          fees except as required by law.
        </p>
      </Section>

      <Section title="Disclaimers">
        <p>
          Except as expressly stated in these terms, DeployBro is provided
          "as is" and "as available" without warranties of any kind, whether
          express, implied or statutory, including warranties of
          merchantability, fitness for a particular purpose,
          non-infringement, or accuracy.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, DeployBro will not be
          liable for indirect, incidental, special, consequential or punitive
          damages, or for loss of profits, revenue, data or goodwill. Our
          aggregate liability for any claim arising out of these terms is
          capped at the greater of £100 or the fees you paid us in the 12
          months preceding the event giving rise to the claim. Nothing in
          these terms excludes liability for death or personal injury caused
          by negligence, fraud, or any other liability that cannot be
          excluded under English law.
        </p>
      </Section>

      <Section title="Indemnity">
        <p>
          You agree to indemnify DeployBro against third-party claims arising
          from your content, your use of the service in breach of these
          terms or the AUP, or your violation of any law or third-party
          right.
        </p>
      </Section>

      <Section title="Governing law & disputes">
        <p>
          These terms are governed by the laws of England and Wales. The
          courts of England and Wales have exclusive jurisdiction, except
          that consumers may bring proceedings in the courts of their
          country of residence as required by law.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms from time to time. Material changes will
          be flagged by email or a banner in the app at least 14 days before
          they take effect. Continued use of the service after that date
          constitutes acceptance.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms? Email{" "}
          <a className="text-primary hover:underline" href="mailto:hello@deploybro.app">
            hello@deploybro.app
          </a>
          .
        </p>
      </Section>
    </Shell>
  );
}

export function AcceptableUse() {
  return (
    <Shell eyebrow="Acceptable use" title="Acceptable use policy" prose>
      <LegalMeta />
      <Section title="The short version">
        <p>
          Use DeployBro to build genuinely useful software. Don't use it to
          hurt people, infringe someone's rights, or attack the open
          internet. If you're unsure whether something is allowed, ask us at{" "}
          <a className="text-primary hover:underline" href="mailto:trust@deploybro.app">
            trust@deploybro.app
          </a>
          .
        </p>
      </Section>

      <Section title="Prohibited content">
        <p>You may not build, host, transmit or link to:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Content that's illegal where you live or where it's accessed.</li>
          <li>
            Sexual content involving minors, or any content that exploits or
            endangers children — we report this to the relevant authorities,
            no exceptions.
          </li>
          <li>
            Content that incites violence, terrorism, self-harm, or hatred
            against people on the basis of a protected characteristic.
          </li>
          <li>
            Personal data of others used without a lawful basis, including
            doxxing and "people search" databases.
          </li>
          <li>
            Material that infringes copyright, trademark, trade secret or
            other intellectual property rights you don't hold.
          </li>
          <li>
            Pretending to be someone else (a person, company or government
            body) to deceive others.
          </li>
        </ul>
      </Section>

      <Section title="Prohibited activities">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            Distributing malware, phishing pages, fraudulent shops, or
            credential stealers.
          </li>
          <li>
            Running denial-of-service attacks, port scanning, or unauthorised
            penetration tests against any system.
          </li>
          <li>
            High-volume scraping of third-party sites, or building tools that
            primarily exist to do so.
          </li>
          <li>
            Sending unsolicited bulk email, SMS, or other messages from
            DeployBro-hosted apps.
          </li>
          <li>
            Cryptocurrency mining, botnets, proxy/VPN services, or other
            uses that abuse our compute resources.
          </li>
          <li>
            Reverse-engineering DeployBro itself, or attempting to bypass
            rate limits, billing, or access controls.
          </li>
        </ul>
      </Section>

      <Section title="Fair use of compute">
        <p>
          DeployBro provides generous-but-not-infinite resources on every
          plan. We may rate-limit, throttle, or pause a project that's
          consuming significantly more bandwidth, build minutes, model
          tokens, or storage than the rest of its plan tier. We'll always
          contact you first when there's a sustained pattern.
        </p>
      </Section>

      <Section title="Reporting abuse">
        <p>
          Found something on a DeployBro-hosted app that breaks this policy?
          Email{" "}
          <a className="text-primary hover:underline" href="mailto:trust@deploybro.app">
            trust@deploybro.app
          </a>{" "}
          with the URL and a brief description. We typically respond within
          one business day. For copyright / IP claims, please include enough
          information for us to identify the work and your authority to act.
        </p>
      </Section>

      <Section title="Enforcement">
        <p>
          When something looks like a violation we'll usually start with a
          warning and a request to fix it. Severe or repeat violations,
          unlawful content, and anything involving harm to children result
          in immediate removal and account termination. We may also report
          conduct to law enforcement where required by law.
        </p>
      </Section>
    </Shell>
  );
}

export function CookiePolicy() {
  return (
    <Shell eyebrow="Cookies" title="Cookie policy" prose>
      <LegalMeta />
      <Section title="What are cookies?">
        <p>
          Cookies are small text files stored on your device by your browser
          when you visit a website. We also use closely-related technologies
          like local storage and session storage — references to "cookies"
          in this policy cover all of them.
        </p>
      </Section>

      <Section title="The cookies we use">
        <p>
          <strong className="text-foreground">Strictly necessary.</strong>{" "}
          Required to deliver the service. These keep you signed in, remember
          your active session, prevent CSRF attacks, and balance traffic
          across servers. They do not require consent under UK and EU law.
        </p>
        <p>
          <strong className="text-foreground">Functional preferences.</strong>{" "}
          Remember choices you've made — light/dark theme, sidebar collapsed
          state, the model you last picked in the builder. They make the app
          more pleasant to use but it still works without them.
        </p>
        <p>
          <strong className="text-foreground">Analytics.</strong> Anonymous,
          aggregated counts of which pages and features are used so we can
          fix what's broken and improve what's popular. We do not use these
          for cross-site advertising or sell the data to anyone.
        </p>
      </Section>

      <Section title="Third-party cookies">
        <p>
          Sign-in flows may briefly set cookies from our identity provider
          (e.g. Google) when you choose that option. Stripe sets cookies on
          checkout pages it serves. We do not set advertising or
          social-network cookies.
        </p>
      </Section>

      <Section title="Managing your choices">
        <p>
          You can clear or block cookies in your browser settings — see the
          help pages for{" "}
          <a className="text-primary hover:underline" href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer">Chrome</a>
          ,{" "}
          <a className="text-primary hover:underline" href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noreferrer">Firefox</a>
          ,{" "}
          <a className="text-primary hover:underline" href="https://support.apple.com/en-gb/HT201265" target="_blank" rel="noreferrer">Safari</a>
          , and{" "}
          <a className="text-primary hover:underline" href="https://support.microsoft.com/en-gb/microsoft-edge" target="_blank" rel="noreferrer">Edge</a>
          . Strictly-necessary cookies cannot be turned off without breaking
          sign-in. We honour Global Privacy Control signals from your browser
          where supported.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We update this policy when we add or remove cookies. The "effective"
          date at the top reflects the latest revision.
        </p>
      </Section>
    </Shell>
  );
}

export function DPA() {
  return (
    <Shell eyebrow="Data processing" title="Data processing addendum" prose>
      <LegalMeta />
      <Section title="When this applies">
        <p>
          This DPA applies whenever DeployBro processes personal data on
          behalf of a customer (you) in connection with the service —
          typically the personal data of your end-users that flows through
          apps you've built and published on DeployBro. It forms part of the
          agreement between us and the{" "}
          <Link href="/terms" className="text-primary hover:underline">
            terms of service
          </Link>
          . If you've signed a bespoke agreement, that agreement controls
          where it conflicts with this DPA.
        </p>
      </Section>

      <Section title="Roles">
        <p>
          You are the data controller for personal data submitted to your
          DeployBro-hosted apps and we act as your data processor. Each
          party will comply with its respective obligations under UK GDPR,
          the EU GDPR, and any other applicable data protection laws.
        </p>
      </Section>

      <Section title="Scope, nature and duration">
        <p>
          We process personal data only to provide the service you've signed
          up for and as further documented in your instructions (which are
          embodied by the configuration of your project, the features you
          enable, and any specific instructions you give us in writing).
          Processing continues for the duration of the agreement.
        </p>
        <p>
          Categories of data subjects and personal data depend on what your
          app collects — typically end-user account details, contact
          information, and any content end-users submit to your app.
        </p>
      </Section>

      <Section title="Confidentiality">
        <p>
          Anyone authorised to process customer personal data on our behalf
          is bound by written confidentiality obligations and trained on
          data-protection responsibilities.
        </p>
      </Section>

      <Section title="Security measures">
        <p>
          We maintain technical and organisational measures designed to
          protect personal data, including: TLS 1.2+ for data in transit;
          encryption at rest for databases and stored secrets; strong access
          controls (SSO + hardware MFA) and least-privilege defaults;
          centralised logging and monitoring; regular dependency patching;
          background checks on engineering staff; and an incident response
          plan exercised at least annually.
        </p>
      </Section>

      <Section title="Subprocessors">
        <p>
          We engage a small number of subprocessors to help us deliver the
          service — currently including Anthropic (AI inference), Vercel
          (hosting for published apps), Neon (Postgres for published apps),
          Stripe (payments), and our transactional email provider. The
          current list is available on request from{" "}
          <a className="text-primary hover:underline" href="mailto:privacy@deploybro.app">
            privacy@deploybro.app
          </a>
          . We will give you at least 30 days' notice before adding a new
          subprocessor; you may object on reasonable data-protection grounds,
          in which case we will work with you in good faith and, failing
          resolution, you may terminate the affected services.
        </p>
      </Section>

      <Section title="International transfers">
        <p>
          Where personal data is transferred outside the UK or EEA, we rely
          on the UK International Data Transfer Agreement, the UK Addendum
          to the EU Standard Contractual Clauses (Module 2 or 3 as
          applicable), or another lawful transfer mechanism, and apply
          supplementary measures where required.
        </p>
      </Section>

      <Section title="Data subject requests">
        <p>
          We will, where technically feasible, assist you in responding to
          requests from data subjects exercising their rights under
          applicable law. Standard self-service tools (export, deletion) are
          available in the dashboard; for anything else, contact us.
        </p>
      </Section>

      <Section title="Personal-data breaches">
        <p>
          We will notify you without undue delay — and in any event within
          72 hours — after becoming aware of a personal-data breach
          affecting customer personal data, with enough detail to let you
          meet your own breach-notification obligations.
        </p>
      </Section>

      <Section title="Audit rights">
        <p>
          We will make available to you all information reasonably necessary
          to demonstrate compliance with this DPA. Where you reasonably
          require an on-site audit beyond that, we will arrange it during
          business hours, on at least 30 days' notice, no more than once a
          year (except after a confirmed incident), at your cost, and
          subject to confidentiality.
        </p>
      </Section>

      <Section title="Return or deletion">
        <p>
          On termination of the service, we will delete or return all
          customer personal data within 30 days, except where retention is
          required by applicable law. Backups are purged on the rolling
          schedule documented in the privacy policy.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          The liability provisions in the{" "}
          <Link href="/terms" className="text-primary hover:underline">
            terms of service
          </Link>{" "}
          apply equally to claims under this DPA. Nothing in this DPA limits
          either party's liability for breaches of data protection law to
          the extent that such limitation is not permitted.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update this DPA from time to time. Material changes will be
          notified by email at least 30 days before they take effect.
        </p>
      </Section>
    </Shell>
  );
}

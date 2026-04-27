import { Link } from "wouter";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Describe the app",
    body: "Tell DeployBro what you want in plain English. Paste a screenshot, reference URL, or rough idea.",
  },
  {
    title: "Watch it build",
    body: "The app appears in the editor with files, preview, auth, and database wired together for you.",
  },
  {
    title: "Publish it",
    body: "Click publish and DeployBro provisions the database, creates the project, and gives you a live URL.",
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />
      <main className="flex-1">
        <section className="px-4 sm:px-6 py-20 md:py-28 border-b border-border">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-5 backdrop-blur-md bg-foreground/[0.04] dark:bg-foreground/[0.06] border border-border/80 text-foreground/80 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              How it works
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5 max-w-3xl text-balance">
              Go from idea to live app in three steps.
            </h1>
            <p className="text-lg text-secondary max-w-2xl">
              No setup maze. No docs rabbit hole. Just describe it, refine it, and publish.
            </p>
          </div>
        </section>

        <section className="px-4 sm:px-6 py-16 md:py-24">
          <div className="max-w-5xl mx-auto space-y-6">
            {STEPS.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-border bg-surface p-6 md:p-8 grid gap-5 md:grid-cols-[120px_1fr]">
                <div className="text-xs font-mono text-primary">STEP {index + 1}</div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
                  <p className="text-secondary leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 sm:px-6 pb-24 md:pb-32">
          <div className="max-w-5xl mx-auto rounded-3xl border border-border bg-surface/60 p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">What you get</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                "Real auth",
                "Real Postgres",
                "Live preview",
                "One-click publish",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link href="/login">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Start building <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

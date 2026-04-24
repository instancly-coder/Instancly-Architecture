import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Search, Sparkles, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import logoUrl from "@assets/download_1776989236348.png";
import {
  COMPONENT_LIBRARY,
  CATEGORY_ORDER,
  type ComponentCategory,
  type LibraryComponent,
} from "@/lib/components-catalog";
import { toast } from "sonner";

export default function Library() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<ComponentCategory | "All">("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COMPONENT_LIBRARY.filter((c) => {
      if (active !== "All" && c.category !== active) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.importPath.toLowerCase().includes(q)
      );
    });
  }, [query, active]);

  const grouped = useMemo(() => {
    const map = new Map<ComponentCategory, LibraryComponent[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const c of filtered) map.get(c.category)?.push(c);
    return Array.from(map.entries()).filter(([, items]) => items.length > 0);
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-border bg-surface h-14 flex items-center px-6 sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 mr-8">
          <img src={logoUrl} alt="Instancly" className="h-5 w-auto" />
          <span className="font-bold tracking-tight text-secondary">/ library</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-secondary hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/explore" className="text-sm text-secondary hover:text-foreground">
            Explore
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-xs text-secondary mb-4">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>{COMPONENT_LIBRARY.length} components ready for the AI to use</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Component Library
          </h1>
          <p className="text-secondary max-w-2xl">
            Every block here is part of Instancly's design system. The AI builder
            knows about each one and will reach for them first when generating
            your app — keeping things consistent, accessible, and on-brand.
          </p>
        </header>

        <div className="flex flex-col md:flex-row gap-3 md:items-center mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search components..."
              className="pl-9 bg-surface border-border"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <CategoryPill label="All" active={active === "All"} onClick={() => setActive("All")} />
            {CATEGORY_ORDER.map((cat) => (
              <CategoryPill
                key={cat}
                label={cat}
                active={active === cat}
                onClick={() => setActive(cat)}
              />
            ))}
          </div>
        </div>

        {grouped.length === 0 ? (
          <div className="text-center text-secondary py-16">
            No components match "{query}".
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(([category, items]) => (
              <section key={category}>
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="text-lg font-bold">{category}</h2>
                  <span className="text-xs text-secondary">{items.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((comp) => (
                    <ComponentCard key={comp.name} component={comp} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-surface text-secondary border-border hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function ComponentCard({ component }: { component: LibraryComponent }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(component.example);
    setCopied(true);
    toast.success(`Copied ${component.name} snippet`);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="border border-border bg-surface rounded-xl p-4 hover:border-primary/50 transition-colors group">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-mono font-medium">{component.name}</div>
          <Badge variant="outline" className="mt-1 text-[10px] font-mono text-secondary border-border">
            {component.importPath.replace("@/components/ui/", "ui/")}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={`Copy ${component.name} example`}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>
      <p className="text-sm text-secondary mb-3">{component.description}</p>
      <pre className="text-[11px] font-mono text-foreground bg-background border border-border rounded p-2 overflow-x-auto">
        <code>{component.example}</code>
      </pre>
    </div>
  );
}

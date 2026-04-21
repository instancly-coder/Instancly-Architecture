import { Link } from "wouter";
import { Flame } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-primary" />
            <span className="font-bold tracking-tight">instancly</span>
          </div>
          <p className="text-xs text-secondary leading-relaxed">
            Ship apps from a single prompt. Real Postgres, real URLs, no DevOps.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-mono uppercase text-secondary mb-3 tracking-wider">Product</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/#features" className="text-foreground/80 hover:text-primary transition-colors">Features</a></li>
            <li><a href="/#pricing" className="text-foreground/80 hover:text-primary transition-colors">Pricing</a></li>
            <li><Link href="/explore" className="text-foreground/80 hover:text-primary transition-colors">Explore</Link></li>
            <li><Link href="/login" className="text-foreground/80 hover:text-primary transition-colors">Start building</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-mono uppercase text-secondary mb-3 tracking-wider">Resources</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="text-foreground/80 hover:text-primary transition-colors">Docs</a></li>
            <li><a href="#" className="text-foreground/80 hover:text-primary transition-colors">Changelog</a></li>
            <li><a href="#" className="text-foreground/80 hover:text-primary transition-colors">Templates</a></li>
            <li><a href="#" className="text-foreground/80 hover:text-primary transition-colors">Status</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-mono uppercase text-secondary mb-3 tracking-wider">Community</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="text-foreground/80 hover:text-primary transition-colors">Discord</a></li>
            <li><a href="#" className="text-foreground/80 hover:text-primary transition-colors">GitHub</a></li>
            <li><a href="#" className="text-foreground/80 hover:text-primary transition-colors">Twitter / X</a></li>
            <li><a href="#" className="text-foreground/80 hover:text-primary transition-colors">Blog</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-mono uppercase text-secondary mb-3 tracking-wider">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="text-foreground/80 hover:text-primary transition-colors">About</a></li>
            <li><a href="#" className="text-foreground/80 hover:text-primary transition-colors">Careers</a></li>
            <li><a href="#" className="text-foreground/80 hover:text-primary transition-colors">Privacy</a></li>
            <li><a href="#" className="text-foreground/80 hover:text-primary transition-colors">Terms</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-secondary">© {new Date().getFullYear()} Instancly. All rights reserved.</p>
          <p className="text-xs text-secondary font-mono">v2.0 · Built with Instancly</p>
        </div>
      </div>
    </footer>
  );
}

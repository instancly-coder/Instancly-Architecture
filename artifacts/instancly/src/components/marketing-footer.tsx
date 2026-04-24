import { Link } from "wouter";
import logoUrl from "@assets/download_1776989236348.png";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="inline-flex items-center mb-3">
            <img src={logoUrl} alt="DeployBro" className="h-6 w-auto object-contain" />
          </Link>
          <p className="text-xs text-secondary leading-relaxed">
            Ship apps from a single prompt. Real Postgres, real URLs, no DevOps.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-mono uppercase text-secondary mb-3 tracking-wider">Product</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/#how" className="text-foreground/80 hover:text-primary transition-colors">How it works</a></li>
            <li><a href="/#templates" className="text-foreground/80 hover:text-primary transition-colors">Templates</a></li>
            <li><Link href="/explore" className="text-foreground/80 hover:text-primary transition-colors">Explore</Link></li>
            <li><Link href="/login" className="text-foreground/80 hover:text-primary transition-colors">Start building</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-mono uppercase text-secondary mb-3 tracking-wider">Resources</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/docs" className="text-foreground/80 hover:text-primary transition-colors">Docs</Link></li>
            <li><Link href="/changelog" className="text-foreground/80 hover:text-primary transition-colors">Changelog</Link></li>
            <li><Link href="/templates" className="text-foreground/80 hover:text-primary transition-colors">Templates</Link></li>
            <li><Link href="/status" className="text-foreground/80 hover:text-primary transition-colors">Status</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-mono uppercase text-secondary mb-3 tracking-wider">Community</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/community" className="text-foreground/80 hover:text-primary transition-colors">Discord</Link></li>
            <li><Link href="/community" className="text-foreground/80 hover:text-primary transition-colors">GitHub</Link></li>
            <li><Link href="/community" className="text-foreground/80 hover:text-primary transition-colors">Twitter / X</Link></li>
            <li><Link href="/blog" className="text-foreground/80 hover:text-primary transition-colors">Blog</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-mono uppercase text-secondary mb-3 tracking-wider">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="text-foreground/80 hover:text-primary transition-colors">About</Link></li>
            <li><Link href="/careers" className="text-foreground/80 hover:text-primary transition-colors">Careers</Link></li>
            <li><Link href="/privacy" className="text-foreground/80 hover:text-primary transition-colors">Privacy</Link></li>
            <li><Link href="/terms" className="text-foreground/80 hover:text-primary transition-colors">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-secondary">© {new Date().getFullYear()} DeployBro. All rights reserved.</p>
          <p className="text-xs text-secondary font-mono">v2.0 · Built with DeployBro</p>
        </div>
      </div>
    </footer>
  );
}

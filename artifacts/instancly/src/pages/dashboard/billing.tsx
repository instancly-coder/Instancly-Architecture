import { Link } from "wouter";
import { Flame, LayoutDashboard, CreditCard, Settings, LogOut, Code, Plus } from "lucide-react";
import { mockUser, mockTransactions } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Billing() {
  const topup = (amount: number) => {
    toast.success(`Topped up £${amount}. (Mocked)`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-64 border-r border-border bg-surface flex flex-col fixed inset-y-0 left-0">
        <div className="h-14 border-b border-border flex items-center px-6 gap-2">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80">
            <Flame className="w-5 h-5 text-primary" />
            <span className="font-bold tracking-tight">instancly</span>
          </Link>
        </div>
        <div className="p-4 flex-1">
          <nav className="space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-secondary hover:text-foreground hover:bg-surface-raised transition-colors">
              <LayoutDashboard className="w-4 h-4" /> Projects
            </Link>
            <Link href="/explore" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-secondary hover:text-foreground hover:bg-surface-raised transition-colors">
              <Code className="w-4 h-4" /> Explore
            </Link>
            <Link href="/dashboard/billing" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md bg-primary/10 text-primary">
              <CreditCard className="w-4 h-4" /> Billing
            </Link>
            <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-secondary hover:text-foreground hover:bg-surface-raised transition-colors">
              <Settings className="w-4 h-4" /> Settings
            </Link>
          </nav>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8 max-w-4xl">
        <h1 className="text-2xl font-bold tracking-tight mb-8">Billing & Plans</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="border border-border bg-surface rounded-xl p-6">
            <h2 className="text-sm font-medium text-secondary mb-2">Current Balance</h2>
            <div className="text-4xl font-mono font-bold mb-6">£{mockUser.balance.toFixed(2)}</div>
            
            <h3 className="text-sm font-medium mb-3">Quick Top-up</h3>
            <div className="flex gap-2">
              {[5, 10, 25, 50].map(amt => (
                <Button key={amt} variant="outline" onClick={() => topup(amt)} className="flex-1 border-border hover:bg-surface-raised">
                  £{amt}
                </Button>
              ))}
            </div>
          </div>

          <div className="border border-border bg-surface rounded-xl p-6 flex flex-col">
            <h2 className="text-sm font-medium text-secondary mb-2">Current Plan</h2>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-2xl font-bold">{mockUser.plan}</div>
              <div className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">Active</div>
            </div>
            <p className="text-sm text-secondary mb-6 flex-1">
              You are on the Pro plan. Includes custom domains, priority support, and higher compute limits.
            </p>
            <Button className="w-full bg-surface-raised hover:bg-border text-foreground border border-border">
              Manage in Stripe <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-4">Transaction History</h2>
        <div className="border border-border rounded-xl bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised/50">
                <th className="text-left font-medium p-4 text-secondary">Date</th>
                <th className="text-left font-medium p-4 text-secondary">Amount</th>
                <th className="text-left font-medium p-4 text-secondary">Method</th>
                <th className="text-right font-medium p-4 text-secondary">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockTransactions.map(tx => (
                <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-surface-raised/50 transition-colors">
                  <td className="p-4">{tx.date}</td>
                  <td className="p-4 font-mono">{tx.amount}</td>
                  <td className="p-4 text-secondary">{tx.method}</td>
                  <td className="p-4 text-right">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-success bg-success/10">
                      <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function ExternalLink(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
}
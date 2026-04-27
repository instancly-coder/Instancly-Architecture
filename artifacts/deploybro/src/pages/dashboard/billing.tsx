import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useMe, useMyTransactions } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function Billing() {
  const { data: user, isLoading: userLoading } = useMe();
  const { data: transactions = [], isLoading: txLoading } = useMyTransactions();

  const topup = (_amount: number) => {
    toast.message("Stripe top-up isn't connected yet.", {
      description: "We'll wire this to a real checkout once Stripe is enabled.",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight mb-6 md:mb-8">
          Billing & Plans
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8 md:mb-12">
          <div className="border border-border bg-surface rounded-xl p-5 md:p-6">
            <h2 className="text-sm font-medium text-secondary mb-2">
              Current Balance
            </h2>
            <div className="text-3xl md:text-4xl font-mono font-bold mb-6 min-h-[2.5rem] flex items-center">
              {userLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-secondary" />
              ) : (
                `£${(user?.balance ?? 0).toFixed(2)}`
              )}
            </div>

            <h3 className="text-sm font-medium mb-3">Quick Top-up</h3>
            <div className="flex gap-2">
              {[5, 10, 25, 50].map((amt) => (
                <Button
                  key={amt}
                  variant="outline"
                  onClick={() => topup(amt)}
                  className="flex-1 border-border hover:bg-surface-raised"
                >
                  £{amt}
                </Button>
              ))}
            </div>
          </div>

          <div className="border border-border bg-surface rounded-xl p-5 md:p-6 flex flex-col">
            <h2 className="text-sm font-medium text-secondary mb-2">
              Current Plan
            </h2>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-2xl font-bold">{user?.plan ?? "—"}</div>
              {user?.status === "active" && (
                <div className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                  Active
                </div>
              )}
            </div>
            <p className="text-sm text-secondary mb-6 flex-1">
              {user?.plan === "free"
                ? "Free plan: enough credit to try DeployBro out. Upgrade for higher limits and custom domains."
                : "Includes custom domains, priority support, and higher compute limits."}
            </p>
            <Button
              onClick={() =>
                toast.message("Stripe portal isn't connected yet.")
              }
              className="w-full bg-surface-raised hover:bg-border text-foreground border border-border"
            >
              Manage in Stripe <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-4">Transaction History</h2>
        <div className="border border-border rounded-xl bg-surface overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="border-b border-border bg-surface-raised/50">
                <th className="text-left font-medium p-3 md:p-4 text-secondary">Date</th>
                <th className="text-left font-medium p-3 md:p-4 text-secondary">Method</th>
                <th className="text-right font-medium p-3 md:p-4 text-secondary">Amount</th>
                <th className="text-right font-medium p-3 md:p-4 text-secondary">Status</th>
              </tr>
            </thead>
            <tbody>
              {txLoading ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-secondary">
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-secondary text-sm">
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-border last:border-0 hover:bg-surface-raised/50 transition-colors"
                  >
                    <td className="p-3 md:p-4">
                      {new Date(tx.createdAt).toISOString().slice(0, 10)}
                    </td>
                    <td className="p-3 md:p-4 text-secondary">{tx.method}</td>
                    <td className="p-3 md:p-4 font-mono text-right">
                      {tx.amount >= 0 ? "+" : ""}
                      £{tx.amount.toFixed(2)}
                    </td>
                    <td className="p-3 md:p-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                          (tx.status?.toLowerCase() === "success")
                            ? "text-success bg-success/10"
                            : "text-secondary bg-surface-raised"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            tx.status?.toLowerCase() === "success" ? "bg-success" : "bg-secondary"
                          }`}
                        />
                        {tx.status ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ExternalLink(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="3" />
    </svg>
  );
}

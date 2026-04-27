import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useMe, useMyTransactions } from "@/lib/api";
import { Loader2, Sparkles } from "lucide-react";
import { CardCheckout, type CardCheckoutMode } from "@/components/card-checkout";

const PRO_MONTHLY_PRICE = 20;

export default function Billing() {
  const { data: user, isLoading: userLoading } = useMe();
  const { data: transactions = [], isLoading: txLoading } = useMyTransactions();

  // One Dialog instance, swapped between top-up and plan modes via
  // local state. We keep the dialog mounted so the close animation
  // doesn't tear down its form mid-flight.
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<CardCheckoutMode>("topup");
  const [checkoutAmount, setCheckoutAmount] = useState(10);

  const isFreePlan = (user?.plan ?? "free").toLowerCase() === "free";

  const openTopup = (amount: number) => {
    setCheckoutMode("topup");
    setCheckoutAmount(amount);
    setCheckoutOpen(true);
  };

  const openPlanUpgrade = () => {
    setCheckoutMode("plan");
    setCheckoutAmount(PRO_MONTHLY_PRICE);
    setCheckoutOpen(true);
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
                `$${(user?.balance ?? 0).toFixed(2)}`
              )}
            </div>

            <h3 className="text-sm font-medium mb-3">Quick Top-up</h3>
            <div className="flex gap-2">
              {[10, 25, 50].map((amt) => (
                <Button
                  key={amt}
                  variant="outline"
                  onClick={() => openTopup(amt)}
                  className="flex-1 border-border hover:bg-surface-raised"
                >
                  ${amt}
                </Button>
              ))}
            </div>
          </div>

          <div className="border border-border bg-surface rounded-xl p-5 md:p-6 flex flex-col">
            <h2 className="text-sm font-medium text-secondary mb-2">
              Current Plan
            </h2>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-2xl font-bold capitalize">{user?.plan ?? "—"}</div>
              {user?.status === "active" && (
                <div className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                  Active
                </div>
              )}
            </div>
            <p className="text-sm text-secondary mb-6 flex-1">
              {isFreePlan
                ? "Free plan: enough credit to try DeployBro out. Upgrade for higher limits and custom domains."
                : "Includes custom domains, priority support, and higher compute limits."}
            </p>
            {isFreePlan ? (
              <Button
                onClick={openPlanUpgrade}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                Upgrade to Pro — ${PRO_MONTHLY_PRICE}/mo
              </Button>
            ) : (
              <Button
                onClick={() =>
                  toast.message("Plan management isn't connected yet.", {
                    description:
                      "We'll wire this to a real customer portal once Stripe is enabled.",
                  })
                }
                className="w-full bg-surface-raised hover:bg-border text-foreground border border-border"
              >
                Manage subscription
              </Button>
            )}
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
                      ${tx.amount.toFixed(2)}
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

      <CardCheckout
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        mode={checkoutMode}
        amount={checkoutAmount}
        productLabel={checkoutMode === "plan" ? "Pro" : `${checkoutAmount} top-up`}
        cadenceLabel={checkoutMode === "plan" ? "month" : undefined}
        description={
          checkoutMode === "plan"
            ? "Pro: $20 of monthly usage, unused balance rolls over up to $10, Sonnet + Opus access, custom domains, one-click Vercel + Neon deploys."
            : `Add $${checkoutAmount.toFixed(2)} of usage credit instantly. Never expires.`
        }
      />
    </DashboardLayout>
  );
}

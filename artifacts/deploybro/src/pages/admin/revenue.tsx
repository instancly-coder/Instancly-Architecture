import { TrendingUp } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { useAdminStats, useAdminCostByModel } from "@/lib/api";

export default function AdminRevenue() {
  const { data: stats } = useAdminStats();
  const { data: costs = [] } = useAdminCostByModel();
  const sortedCosts = [...costs].sort((a, b) => b.total - a.total);

  const revenue = stats?.revenueGbp ?? 0;
  const spend = stats?.spendGbp ?? 0;
  const margin = revenue > 0 ? ((revenue - spend) / revenue) * 100 : 0;

  return (
    <AdminLayout active="revenue">
      <main className="p-8 max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-bold tracking-tight mb-8">Revenue & Margins</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 border border-border bg-surface rounded-xl flex items-center justify-between">
            <div>
              <div className="text-secondary text-sm mb-1">Total Revenue</div>
              <div className="text-3xl font-bold font-mono">${revenue.toFixed(2)}</div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-surface-raised flex items-center justify-center text-primary">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="p-6 border border-border bg-surface rounded-xl flex items-center justify-between">
            <div>
              <div className="text-secondary text-sm mb-1">Compute Cost</div>
              <div className="text-3xl font-bold font-mono">${spend.toFixed(2)}</div>
            </div>
          </div>
          <div className="p-6 border border-border bg-surface rounded-xl flex items-center justify-between">
            <div>
              <div className="text-secondary text-sm mb-1">Margin</div>
              <div className={`text-3xl font-bold font-mono ${margin >= 0 ? "text-success" : "text-error"}`}>
                {margin.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <div className="border border-border bg-surface rounded-xl flex flex-col overflow-hidden max-w-2xl">
          <div className="p-4 border-b border-border font-bold">Cost by Model (all time)</div>
          {sortedCosts.length === 0 ? (
            <div className="p-6 text-center text-secondary text-sm">No build cost recorded yet.</div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {sortedCosts.map((row) => (
                  <tr key={row.model} className="border-b border-border last:border-0 hover:bg-surface-raised/30">
                    <td className="p-4 font-mono">{row.model}</td>
                    <td className="p-4 text-right font-mono">${row.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}

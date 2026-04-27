import { Users, Activity, CreditCard, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/admin-layout";
import { useAdminStats, useAdminRecentBuilds } from "@/lib/api";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function Admin() {
  const { data: stats } = useAdminStats();
  const { data: recent = [] } = useAdminRecentBuilds();

  return (
    <AdminLayout active="overview">
      <main className="p-8 max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-bold tracking-tight mb-8">Admin Overview</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Users" value={stats?.totalUsers?.toLocaleString() ?? "—"} icon={Users} />
          <StatCard title="Total Revenue" value={stats ? `$${stats.revenueGbp.toFixed(2)}` : "—"} icon={CreditCard} />
          <StatCard title="Builds (24h)" value={stats?.buildsToday?.toLocaleString() ?? "—"} icon={Activity} />
          <StatCard title="Total Projects" value={stats?.totalProjects?.toLocaleString() ?? "—"} icon={Database} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 border border-border bg-surface rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border font-medium">Recent Builds</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-raised/50 text-secondary text-left">
                  <th className="p-3 font-medium">User</th>
                  <th className="p-3 font-medium">Project</th>
                  <th className="p-3 font-medium">When</th>
                  <th className="p-3 font-medium">Cost</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-secondary">No builds yet.</td>
                  </tr>
                ) : (
                  recent.map((build) => (
                    <tr key={build.id} className="border-t border-border hover:bg-surface-raised/30">
                      <td className="p-3 font-mono">@{build.username}</td>
                      <td className="p-3 font-mono">{build.project}</td>
                      <td className="p-3 text-secondary">{timeAgo(build.createdAt)}</td>
                      <td className="p-3 font-mono">${build.cost.toFixed(2)}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${
                            build.status === "success" ? "text-success bg-success/10" : "text-error bg-error/10"
                          }`}
                        >
                          {build.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border border-border bg-surface rounded-xl p-4 flex flex-col">
            <div className="font-medium mb-4">Cost vs Revenue</div>
            <div className="space-y-3 flex-1">
              <div className="p-3 bg-surface-raised border border-border rounded text-sm">
                <div className="text-secondary text-xs mb-1">Compute spend</div>
                <div className="font-mono text-lg">${(stats?.spendGbp ?? 0).toFixed(2)}</div>
              </div>
              <div className="p-3 bg-surface-raised border border-border rounded text-sm">
                <div className="text-secondary text-xs mb-1">Net (revenue − spend)</div>
                <div className="font-mono text-lg">
                  ${((stats?.revenueGbp ?? 0) - (stats?.spendGbp ?? 0)).toFixed(2)}
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4 bg-background border-border hover:bg-surface-raised">
              View full revenue
            </Button>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="p-6 border border-border bg-surface rounded-xl flex items-center justify-between">
      <div>
        <div className="text-secondary text-sm mb-1">{title}</div>
        <div className="text-3xl font-bold font-mono">{value}</div>
      </div>
      <div className="w-12 h-12 rounded-lg bg-surface-raised flex items-center justify-center text-primary">
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

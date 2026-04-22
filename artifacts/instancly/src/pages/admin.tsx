import { Link } from "wouter";
import { BoxLogo } from "@/components/box-logo";
import { Users, Activity, CreditCard, Search, MoreHorizontal } from "lucide-react";
import { mockAdminStats } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

export default function Admin() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-border bg-surface h-14 flex items-center px-6 sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 mr-8">
          <BoxLogo className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tight">instancly admin</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/admin" className="text-primary font-medium">Overview</Link>
          <Link href="/admin/users" className="text-secondary hover:text-foreground">Users</Link>
          <Link href="/admin/models" className="text-secondary hover:text-foreground">Models</Link>
          <Link href="/admin/revenue" className="text-secondary hover:text-foreground">Revenue</Link>
        </div>
      </nav>

      <main className="p-8 max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-bold tracking-tight mb-8">Admin Overview</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Users" value={mockAdminStats.totalUsers.toString()} icon={Users} />
          <StatCard title="MRR" value={mockAdminStats.mrr} icon={CreditCard} />
          <StatCard title="Builds Today" value={mockAdminStats.buildsToday.toString()} icon={Activity} />
          <StatCard title="Active Models" value={mockAdminStats.activeModels.toString()} icon={Box} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 border border-border bg-surface rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border font-medium">Recent Builds</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-raised/50 text-secondary text-left">
                  <th className="p-3 font-medium">User</th>
                  <th className="p-3 font-medium">Project</th>
                  <th className="p-3 font-medium">Duration</th>
                  <th className="p-3 font-medium">Cost</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockAdminStats.recentBuilds.map(build => (
                  <tr key={build.id} className="border-t border-border hover:bg-surface-raised/30">
                    <td className="p-3 font-mono">@{build.user}</td>
                    <td className="p-3 font-mono">{build.project}</td>
                    <td className="p-3">{build.duration}</td>
                    <td className="p-3">{build.cost}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${build.status === 'success' ? 'text-success bg-success/10' : 'text-error bg-error/10'}`}>
                        {build.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-border bg-surface rounded-xl p-4 flex flex-col">
            <div className="font-medium mb-4">System Alerts</div>
            <div className="space-y-3 flex-1">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-sm text-amber-500">
                <div className="font-bold mb-1">High API Latency</div>
                Anthropic API is experiencing elevated latency (~2.4s).
              </div>
              <div className="p-3 bg-surface-raised border border-border rounded text-sm text-secondary">
                No other alerts. Systems nominal.
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4 bg-background border-border hover:bg-surface-raised">View Logs</Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: any) {
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
  )
}

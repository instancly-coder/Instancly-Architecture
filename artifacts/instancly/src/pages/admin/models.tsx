import { Link } from "wouter";
import { BoxLogo } from "@/components/box-logo";
import { Plus, Play } from "lucide-react";
import { mockModels } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

export default function AdminModels() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-border bg-surface h-14 flex items-center px-6 sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 mr-8">
          <BoxLogo className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tight">instancly admin</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/admin" className="text-secondary hover:text-foreground">Overview</Link>
          <Link href="/admin/users" className="text-secondary hover:text-foreground">Users</Link>
          <Link href="/admin/models" className="text-primary font-medium">Models</Link>
          <Link href="/admin/revenue" className="text-secondary hover:text-foreground">Revenue</Link>
        </div>
      </nav>

      <main className="p-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-tight">AI Models</h1>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
            <Plus className="w-4 h-4 mr-2" /> Add model
          </Button>
        </div>

        <div className="border border-border bg-surface rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-raised/50 text-secondary text-left">
                <th className="p-4 font-medium">Model Name</th>
                <th className="p-4 font-medium">Provider</th>
                <th className="p-4 font-medium">Cost Range (in/out)</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockModels.map(model => (
                <tr key={model.name} className="border-t border-border hover:bg-surface-raised/30">
                  <td className="p-4 font-mono font-medium">{model.name}</td>
                  <td className="p-4 text-secondary">{model.provider}</td>
                  <td className="p-4 font-mono text-secondary">{model.costRange}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs text-success bg-success/10">
                      <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                      Active
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="outline" size="sm" className="h-8 border-border hover:bg-surface-raised">
                      <Play className="w-3 h-3 mr-2" /> Test
                    </Button>
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

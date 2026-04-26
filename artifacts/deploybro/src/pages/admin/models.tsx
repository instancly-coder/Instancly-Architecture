import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/admin-layout";
import { useAdminCostByModel } from "@/lib/api";

const CONFIGURED_MODELS = [
  { name: "Economy Bro", provider: "Anthropic · Haiku 4.5", costRange: "£0.005 - £0.025" },
  { name: "Power Bro",   provider: "Anthropic · Opus",      costRange: "£0.02 - £0.10"   },
];

export default function AdminModels() {
  const { data: costs = [] } = useAdminCostByModel();
  const lookup = new Map(costs.map((c) => [c.model, c.total]));

  return (
    <AdminLayout active="models">
      <main className="p-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-tight">AI Models</h1>
        </div>

        <div className="border border-border bg-surface rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-raised/50 text-secondary text-left">
                <th className="p-4 font-medium">Model Name</th>
                <th className="p-4 font-medium">Provider</th>
                <th className="p-4 font-medium">Cost Range (in/out)</th>
                <th className="p-4 font-medium">Total spend</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {CONFIGURED_MODELS.map((model) => (
                <tr key={model.name} className="border-t border-border hover:bg-surface-raised/30">
                  <td className="p-4 font-mono font-medium">{model.name}</td>
                  <td className="p-4 text-secondary">{model.provider}</td>
                  <td className="p-4 font-mono text-secondary">{model.costRange}</td>
                  <td className="p-4 font-mono">£{(lookup.get(model.name) ?? 0).toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="h-8 border-border hover:bg-surface-raised"
                    >
                      <Play className="w-3 h-3 mr-2" /> Test
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </AdminLayout>
  );
}

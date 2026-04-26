import { useState } from "react";
import { Search, Loader2, Star, StarOff } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin-layout";
import {
  useAdminTemplates,
  useSetFeaturedTemplate,
  type ApiAdminTemplateItem,
} from "@/lib/api";

export default function AdminTemplates() {
  const [query, setQuery] = useState("");
  const { data: rows = [], isLoading } = useAdminTemplates();
  const setFeatured = useSetFeaturedTemplate();

  const filtered = rows.filter((r: ApiAdminTemplateItem) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.slug.toLowerCase().includes(q) ||
      r.author.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q)
    );
  });

  const featuredCount = rows.filter((r) => r.isFeaturedTemplate).length;

  const onToggle = (row: ApiAdminTemplateItem, next: boolean) => {
    setFeatured.mutate(
      { id: row.id, isFeaturedTemplate: next },
      {
        onSuccess: () =>
          toast.success(
            next
              ? `Featured ${row.name} on /templates`
              : `Removed ${row.name} from /templates`,
          ),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Update failed"),
      },
    );
  };

  return (
    <AdminLayout active="templates">
      <main className="p-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
            <p className="text-sm text-secondary mt-1">
              Curate which public projects appear on{" "}
              <Link href="/templates" className="text-primary hover:underline">
                /templates
              </Link>
              . {featuredCount} of {rows.length} currently featured.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
            <Input
              placeholder="Search name, slug, author…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-surface border-border"
            />
          </div>
        </div>

        <div className="border border-border bg-surface rounded-xl overflow-hidden mt-6">
          {isLoading ? (
            <div className="p-8 text-center text-secondary">
              <Loader2 className="w-4 h-4 animate-spin inline" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-secondary text-sm">
              No public projects match.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-raised/50 text-secondary text-left border-b border-border">
                  <th className="p-4 font-medium">Project</th>
                  <th className="p-4 font-medium">Author</th>
                  <th className="p-4 font-medium">Framework</th>
                  <th className="p-4 font-medium text-right">Clones</th>
                  <th className="p-4 font-medium text-right">Featured</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border last:border-0 hover:bg-surface-raised/30"
                  >
                    <td className="p-4">
                      <div className="font-medium mb-0.5">
                        <Link
                          href={`/${r.author}/${r.slug}`}
                          className="hover:text-primary"
                        >
                          {r.name}
                        </Link>
                      </div>
                      <div className="text-xs text-secondary line-clamp-1 max-w-md">
                        {r.description || "—"}
                      </div>
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/${r.author}`}
                        className="font-mono text-xs hover:text-primary"
                      >
                        @{r.author}
                      </Link>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-xs border border-border bg-background">
                        {r.framework}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-right">{r.clones}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {r.isFeaturedTemplate ? (
                          <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                        ) : (
                          <StarOff className="w-3.5 h-3.5 text-secondary" />
                        )}
                        <Switch
                          checked={r.isFeaturedTemplate}
                          disabled={
                            setFeatured.isPending &&
                            setFeatured.variables?.id === r.id
                          }
                          onCheckedChange={(next) => onToggle(r, next)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button asChild variant="outline" size="sm" className="border-border">
            <Link href="/templates">Open public /templates →</Link>
          </Button>
        </div>
      </main>
    </AdminLayout>
  );
}

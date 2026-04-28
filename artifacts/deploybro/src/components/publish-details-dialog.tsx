import { useEffect, useRef, useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  useUpdateProject,
  useProject,
  type ApiProjectListItem,
} from "@/lib/api";

// Per-row chip editor used for both "Key features" and "Included
// sections". Keeps a controlled draft input + a button that promotes it
// to a chip; chips can be removed individually.
function ChipList({
  label,
  placeholder,
  values,
  onChange,
  max,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
  max: number;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.length >= max) return;
    if (values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };

  const remove = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          disabled={values.length >= max}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={add}
          disabled={!draft.trim() || values.length >= max}
          aria-label={`Add ${label.toLowerCase()}`}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span
              key={`${v}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-surface-raised border border-border pl-3 pr-1 py-1 text-xs"
            >
              {v}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${v}`}
                className="rounded-full p-0.5 text-secondary hover:text-foreground hover:bg-background"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="text-[11px] text-secondary">
        {values.length} / {max}
      </div>
    </div>
  );
}

export type PublishDetailsProject = Pick<
  ApiProjectListItem,
  "name" | "slug" | "description"
>;

export function PublishDetailsDialog({
  open,
  onOpenChange,
  username,
  project,
  // When true, submit also flips `isPublic` to true. Used for the
  // private→public toggle so the dialog acts as the single confirmation
  // step. Defaults to false (pure edit) for already-public projects.
  publishOnSave = false,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  project: PublishDetailsProject;
  publishOnSave?: boolean;
  onPublished?: () => void;
}) {
  // Hydrate the form from the freshest server copy of the project so
  // the user always edits the latest description / features etc, even
  // if the profile-page list is slightly stale. Only fires while the
  // dialog is open.
  const { data: detail } = useProject(open ? username : undefined, project.slug);
  const update = useUpdateProject(username, project.slug);

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [features, setFeatures] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [setup, setSetup] = useState("");

  // Track whether we've hydrated for this open cycle so an in-flight
  // GET that resolves AFTER the user starts typing can't clobber their
  // edits. We seed once from `project` immediately on open, then again
  // once `detail` arrives (with the freshest server values). After that
  // second pass `hydratedFromDetail` flips on and any subsequent
  // `detail` change is ignored. The ref resets on close.
  const hydratedFromDetailRef = useRef(false);

  useEffect(() => {
    if (!open) {
      hydratedFromDetailRef.current = false;
      return;
    }

    if (!detail) {
      // First-paint seed from the list-row data we already have. Don't
      // mark detail-hydrated yet — we still want to upgrade once the
      // GET lands.
      setName(project.name);
      setDescription(project.description ?? "");
      setFeatures([]);
      setSections([]);
      setSetup("");
      return;
    }

    if (hydratedFromDetailRef.current) return;
    hydratedFromDetailRef.current = true;
    setName(detail.name);
    setDescription(detail.description ?? "");
    setFeatures(detail.features ?? []);
    setSections(detail.sections ?? []);
    setSetup(detail.setup ?? "");
  }, [open, detail, project.name, project.description]);

  const submit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Title is required");
      return;
    }
    update.mutate(
      {
        name: trimmedName,
        description: description.trim(),
        features,
        sections,
        setup,
        ...(publishOnSave ? { isPublic: true } : {}),
      },
      {
        onSuccess: () => {
          toast.success(
            publishOnSave
              ? `Published ${trimmedName}`
              : `Saved publish details`,
          );
          onOpenChange(false);
          onPublished?.();
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Update failed"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {publishOnSave ? "Publish project" : "Edit publish details"}
          </DialogTitle>
          <DialogDescription>
            This is what visitors will see on the public project page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="pd-title">Title</Label>
            <Input
              id="pd-title"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="e.g. SaaS landing page"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pd-about">About</Label>
            <Textarea
              id="pd-about"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={600}
              rows={3}
              placeholder="One or two sentences explaining what this project is."
            />
            <div className="text-[11px] text-secondary text-right">
              {description.length} / 600
            </div>
          </div>

          <ChipList
            label="Key features"
            placeholder="Add a feature and press Enter"
            values={features}
            onChange={setFeatures}
            max={12}
          />

          <ChipList
            label="Included sections"
            placeholder="e.g. Landing, Pricing, Auth"
            values={sections}
            onChange={setSections}
            max={24}
          />

          <div className="space-y-2">
            <Label htmlFor="pd-setup">Setup</Label>
            <Textarea
              id="pd-setup"
              value={setup}
              onChange={(e) => setSetup(e.target.value)}
              maxLength={4000}
              rows={5}
              placeholder={
                "e.g.\n1. Clone the project\n2. Add your DATABASE_URL\n3. Run pnpm dev"
              }
              className="font-mono text-sm"
            />
            <div className="text-[11px] text-secondary text-right">
              {setup.length} / 4000
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={update.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={update.isPending}>
            {update.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {publishOnSave ? "Publish" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

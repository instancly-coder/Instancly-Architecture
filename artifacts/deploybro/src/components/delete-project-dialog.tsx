import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteProjectDialog({
  open,
  onOpenChange,
  projectName,
  slug,
  hasHosting,
  hasDatabase,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  slug: string;
  hasHosting: boolean;
  hasDatabase: boolean;
  isPending: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const matches = typed.trim() === slug;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-surface max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <DialogTitle>Delete project</DialogTitle>
          </div>
          <DialogDescription className="text-secondary text-sm pt-1">
            This permanently deletes <span className="font-semibold text-foreground">{projectName}</span>. There is no undo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wider font-mono">
              What gets deleted
            </p>
            <ul className="text-xs text-foreground space-y-1 pl-1">
              <li className="flex items-start gap-1.5">
                <span className="text-destructive mt-0.5">•</span>
                <span>The project, all its files, build history, and deployment history</span>
              </li>
              {hasHosting && (
                <li className="flex items-start gap-1.5">
                  <span className="text-destructive mt-0.5">•</span>
                  <span>
                    The hosted site on <span className="font-mono font-semibold">Vercel</span> (the live URL stops working immediately)
                  </span>
                </li>
              )}
              {hasDatabase && (
                <li className="flex items-start gap-1.5">
                  <span className="text-destructive mt-0.5">•</span>
                  <span>
                    The Postgres database on <span className="font-mono font-semibold">Neon</span> and all of its data
                  </span>
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-slug" className="text-xs text-secondary">
              Type <span className="font-mono font-semibold text-foreground">{slug}</span> to confirm:
            </Label>
            <Input
              id="confirm-slug"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={slug}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="bg-background border-border font-mono"
              data-testid="delete-confirm-input"
              disabled={isPending}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches && !isPending) {
                  void onConfirm();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="border-border"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={!matches || isPending}
            data-testid="delete-confirm-button"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

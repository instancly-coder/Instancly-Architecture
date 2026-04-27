import { useEffect, useState } from "react";
import {
  Search,
  MoreHorizontal,
  ShieldAlert,
  Loader2,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin-layout";
import {
  useAdminUsers,
  useUpdateUserCommissionPct,
  type AdminUser,
} from "@/lib/api";

const DEFAULT_COMMISSION_PCT = 15;

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: users = [], isLoading } = useAdminUsers();

  const filteredUsers = users.filter(
    (u) => u.username.includes(searchTerm) || u.email.includes(searchTerm),
  );

  return (
    <AdminLayout active="users">
      <main className="p-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
            <Input
              placeholder="Search username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-surface border-border"
            />
          </div>
        </div>

        <div className="border border-border bg-surface rounded-xl overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-secondary">
              <Loader2 className="w-4 h-4 animate-spin inline" />
            </div>
          ) : (
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="bg-surface-raised/50 text-secondary text-left border-b border-border">
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Plan</th>
                  <th className="p-4 font-medium">Balance</th>
                  <th className="p-4 font-medium">Signup Date</th>
                  <th className="p-4 font-medium">Commission</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-0 hover:bg-surface-raised/30"
                  >
                    <td className="p-4">
                      <div className="font-mono font-medium mb-0.5">
                        @{user.username}
                      </div>
                      <div className="text-xs text-secondary">{user.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-xs border border-border bg-background">
                        {user.plan}
                      </span>
                    </td>
                    <td className="p-4 font-mono">${user.balance.toFixed(2)}</td>
                    <td className="p-4 text-secondary">{user.signupDate}</td>
                    <td className="p-4">
                      <CommissionCell user={user} />
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${
                          user.status === "active"
                            ? "text-success bg-success/10"
                            : "text-error bg-error/10"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.status === "active"
                              ? "bg-success"
                              : "bg-error"
                          }`}
                        />
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-surface-raised border-border"
                        >
                          <DropdownMenuItem
                            onClick={() =>
                              toast.message("Profile view not yet implemented.")
                            }
                          >
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-error focus:text-error"
                            onClick={() =>
                              toast.message(
                                `Suspend isn't wired yet for @${user.username}.`,
                              )
                            }
                          >
                            <ShieldAlert className="w-4 h-4 mr-2" /> Suspend
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-secondary">
                      No users found
                      {searchTerm ? ` matching "${searchTerm}"` : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}

/**
 * Inline editor for a single user's referral commission %.
 *
 * Default mode shows the current override (or "default" in muted text
 * when null) plus a small pencil affordance. Clicking enters an edit
 * state with a number input, "save", "cancel", and a "use default"
 * button that PATCHes the value back to `null`.
 */
function CommissionCell({ user }: { user: AdminUser }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(
    user.referralCommissionPct == null ? "" : String(user.referralCommissionPct),
  );
  const mutation = useUpdateUserCommissionPct();

  // Re-sync the local input whenever the upstream value changes (e.g.
  // after a successful save invalidates the list query). Without this
  // the input keeps the stale "edited" string after we collapse back to
  // the read-only display.
  useEffect(() => {
    setValue(
      user.referralCommissionPct == null
        ? ""
        : String(user.referralCommissionPct),
    );
  }, [user.referralCommissionPct]);

  const submit = (next: number | null) => {
    mutation.mutate(
      { id: user.id, referralCommissionPct: next },
      {
        onSuccess: () => {
          toast.success(
            next == null
              ? `Reset @${user.username} to platform default (${DEFAULT_COMMISSION_PCT}%).`
              : `Set @${user.username}'s commission to ${next}%.`,
          );
          setEditing(false);
        },
        onError: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : "Failed to update commission.";
          toast.error(message);
        },
      },
    );
  };

  if (!editing) {
    const pct = user.referralCommissionPct;
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group inline-flex items-center gap-1.5 text-sm hover:text-primary"
        title="Edit commission %"
      >
        {pct == null ? (
          <span className="text-secondary">
            {DEFAULT_COMMISSION_PCT}% <span className="text-xs">(default)</span>
          </span>
        ) : (
          <span className="font-mono">{pct}%</span>
        )}
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  const parsed = value.trim() === "" ? null : Number(value);
  const valid =
    parsed === null ||
    (Number.isInteger(parsed) && parsed >= 0 && parsed <= 100);

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        max={100}
        step={1}
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && valid) submit(parsed);
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-7 w-16 px-2 text-sm bg-background border-border"
        placeholder={String(DEFAULT_COMMISSION_PCT)}
      />
      <span className="text-xs text-secondary">%</span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={!valid || mutation.isPending}
        onClick={() => submit(parsed)}
        className="h-7 w-7 p-0"
        title="Save"
      >
        {mutation.isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Check className="w-3.5 h-3.5" />
        )}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          setValue(
            user.referralCommissionPct == null
              ? ""
              : String(user.referralCommissionPct),
          );
          setEditing(false);
        }}
        className="h-7 w-7 p-0"
        title="Cancel"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
      {user.referralCommissionPct != null && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={mutation.isPending}
          onClick={() => submit(null)}
          className="h-7 px-2 text-xs"
          title="Use platform default"
        >
          default
        </Button>
      )}
    </div>
  );
}

import { useState } from "react";
import { Search, MoreHorizontal, ShieldAlert, Loader2 } from "lucide-react";
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
import { useAdminUsers } from "@/lib/api";

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

        <div className="border border-border bg-surface rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-secondary">
              <Loader2 className="w-4 h-4 animate-spin inline" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-raised/50 text-secondary text-left border-b border-border">
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Plan</th>
                  <th className="p-4 font-medium">Balance</th>
                  <th className="p-4 font-medium">Signup Date</th>
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
                      <div className="font-mono font-medium mb-0.5">@{user.username}</div>
                      <div className="text-xs text-secondary">{user.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-xs border border-border bg-background">
                        {user.plan}
                      </span>
                    </td>
                    <td className="p-4 font-mono">£{user.balance.toFixed(2)}</td>
                    <td className="p-4 text-secondary">{user.signupDate}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${
                          user.status === "active" ? "text-success bg-success/10" : "text-error bg-error/10"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.status === "active" ? "bg-success" : "bg-error"
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
                        <DropdownMenuContent align="end" className="bg-surface-raised border-border">
                          <DropdownMenuItem
                            onClick={() => toast.message("Profile view not yet implemented.")}
                          >
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-error focus:text-error"
                            onClick={() =>
                              toast.message(`Suspend isn't wired yet for @${user.username}.`)
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
                    <td colSpan={6} className="p-8 text-center text-secondary">
                      No users found{searchTerm ? ` matching "${searchTerm}"` : ""}.
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

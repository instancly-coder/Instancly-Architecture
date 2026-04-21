import { Link } from "wouter";
import { Flame, Plus, MoreVertical, LayoutDashboard, CreditCard, Settings, LogOut, Code, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { mockUser, mockProjects } from "@/lib/mock-data";

export default function Dashboard() {
  const hasLowBalance = mockUser.balance < 20.00; // Trigger demo warning

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col fixed inset-y-0 left-0">
        <div className="h-14 border-b border-border flex items-center px-6 gap-2">
          <Flame className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tight">instancly</span>
        </div>
        <div className="p-4 flex-1">
          <nav className="space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md bg-primary/10 text-primary">
              <LayoutDashboard className="w-4 h-4" /> Projects
            </Link>
            <Link href="/explore" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-secondary hover:text-foreground hover:bg-surface-raised transition-colors">
              <Code className="w-4 h-4" /> Explore
            </Link>
            <Link href="/dashboard/billing" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-secondary hover:text-foreground hover:bg-surface-raised transition-colors">
              <CreditCard className="w-4 h-4" /> Billing
            </Link>
            <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-secondary hover:text-foreground hover:bg-surface-raised transition-colors">
              <Settings className="w-4 h-4" /> Settings
            </Link>
          </nav>
        </div>
        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-surface-raised transition-colors text-left">
                <div className="w-8 h-8 rounded bg-border flex items-center justify-center font-bold text-sm">
                  {mockUser.username[0].toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-medium truncate">{mockUser.displayName}</div>
                  <div className="text-xs text-secondary truncate">@{mockUser.username}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-surface-raised border-border">
              <div className="px-2 py-1.5 text-sm font-medium">Account</div>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="text-secondary hover:text-foreground cursor-pointer">
                Profile ({mockUser.plan})
              </DropdownMenuItem>
              <DropdownMenuItem className="text-error focus:text-error cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        {hasLowBalance && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-500 text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              Your balance is running low (£{mockUser.balance.toFixed(2)}). Top up to ensure continuous service.
            </div>
            <Link href="/dashboard/billing">
              <Button size="sm" variant="outline" className="h-8 border-amber-500/30 text-amber-500 hover:bg-amber-500/10">Top up</Button>
            </Link>
          </div>
        )}

        <header className="h-20 px-8 flex items-center justify-between border-b border-border">
          <h1 className="text-2xl font-bold tracking-tight">Hey, {mockUser.username}</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard/billing" className="px-3 py-1.5 rounded-full bg-surface border border-border text-sm font-mono font-medium hover:bg-surface-raised transition-colors">
              £{mockUser.balance.toFixed(2)}
            </Link>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
              <Plus className="w-4 h-4 mr-2" /> New project
            </Button>
          </div>
        </header>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {mockProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function ProjectCard({ project }: { project: any }) {
  return (
    <div className="group relative border border-border bg-surface rounded-xl overflow-hidden hover-elevate transition-all duration-200">
      <Link href={`/${mockUser.username}/${project.slug}/build`} className="absolute inset-0 z-10" />
      
      <div className="h-32 bg-gradient-to-br from-surface-raised to-background border-b border-border flex items-center justify-center p-4">
        {/* Placeholder thumbnail */}
        <div className="w-full h-full rounded border border-border/50 bg-background/50 flex flex-col px-4 py-3">
           <div className="w-1/2 h-2 bg-border/50 rounded mb-2"></div>
           <div className="w-3/4 h-2 bg-border/50 rounded mb-1"></div>
           <div className="w-2/3 h-2 bg-border/50 rounded mb-4"></div>
           <div className="mt-auto self-end w-8 h-8 rounded bg-border/50"></div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold truncate pr-2">{project.name}</h3>
          <div className="flex items-center gap-2 relative z-20">
            <div className={`status-dot ${project.status === 'live' ? '' : project.status === 'error' ? 'red' : 'amber'}`} title={project.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-surface-raised rounded text-secondary hover:text-foreground">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-surface-raised border-border">
                <DropdownMenuItem className="cursor-pointer">Rename</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem className="text-error focus:text-error cursor-pointer">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="text-xs font-mono text-secondary mb-4 truncate">
          {project.slug}
        </div>
        
        <div className="flex items-center justify-between text-xs text-secondary">
          <div className="flex items-center gap-2">
            <span>{project.framework}</span>
            <span>•</span>
            <span>{project.builds} builds</span>
          </div>
          <span>{project.lastActive}</span>
        </div>
      </div>
    </div>
  );
}

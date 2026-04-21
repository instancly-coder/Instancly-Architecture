import { useState } from "react";
import { Link, useParams } from "wouter";
import { 
  Flame, ChevronRight, FolderTree, Database, History, Settings as SettingsIcon, MoreVertical,
  Monitor, Tablet, Smartphone, Copy, ExternalLink, X, Play,
  Brain, Sparkles, FileText, Loader2, CheckCircle2, Send,
  FileCode2, FolderClosed
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { mockUser, mockModels } from "@/lib/mock-data";
import { toast } from "sonner";

export default function Builder() {
  const params = useParams();
  const { username, slug } = params;
  
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [activities, setActivities] = useState<any[]>([]);

  // Modals / Panels state
  const [activePanel, setActivePanel] = useState<"none" | "files" | "database" | "history">("none");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  const togglePanel = (panel: "files" | "database" | "history") => {
    setActivePanel(prev => prev === panel ? "none" : panel);
  };

  const handleSend = () => {
    if (!chatInput.trim() || isStreaming) return;
    
    setChatInput("");
    setIsStreaming(true);
    setActivities([]);

    // Fake stream
    const steps = [
      { id: 1, type: "thinking", text: "Thinking about implementation...", icon: Brain, color: "text-secondary", delay: 0 },
      { id: 2, type: "planning", text: "Planning architecture...", icon: Sparkles, color: "text-primary", delay: 1000 },
      { id: 3, type: "reading", text: "Reading src/components/ui...", icon: FileText, color: "text-secondary", delay: 2000 },
      { id: 4, type: "writing", text: "Writing src/app/page.tsx...", icon: Loader2, color: "text-primary animate-spin", delay: 3000 },
      { id: 5, type: "done", text: "Done · £0.03 · 4.1s", icon: CheckCircle2, color: "text-success", delay: 4500 },
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setActivities(prev => [...prev.filter(a => a.type !== "writing" && a.type !== "thinking" && a.type !== "planning"), step]);
        if (step.type === "done") {
          setIsStreaming(false);
        }
      }, step.delay);
    });
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(`${slug}-${username}.instancly.app`);
    toast.success("URL copied to clipboard");
  };

  const copyDbUrl = () => {
    navigator.clipboard.writeText(`postgres://user:pass@ep-cool-db.neon.tech/main`);
    toast.success("Connection string copied to clipboard");
  };

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden text-foreground">
      {/* Top Navbar */}
      <header className="h-12 border-b border-border bg-surface flex items-center justify-between px-4 shrink-0 relative z-50">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
            <Flame className="w-5 h-5 text-primary" />
          </Link>
          <div className="w-px h-4 bg-border mx-1"></div>
          <div className="flex items-center text-sm font-mono text-secondary">
            <span>{username}</span>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-foreground">{slug}</span>
          </div>
          <div className="status-dot ml-2" title="Live"></div>
        </div>

        <div className="flex items-center gap-1">
          <NavIconButton icon={FolderTree} tooltip="Files" active={activePanel === "files"} onClick={() => togglePanel("files")} />
          <NavIconButton icon={Database} tooltip="Database" active={activePanel === "database"} onClick={() => togglePanel("database")} />
          <NavIconButton icon={History} tooltip="History" active={activePanel === "history"} onClick={() => togglePanel("history")} />
          <NavIconButton icon={SettingsIcon} tooltip="Settings" active={isSettingsOpen} onClick={() => setIsSettingsOpen(true)} />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-md flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors ml-1">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="bg-surface-raised border-border">
              <DropdownMenuItem>Rules Book</DropdownMenuItem>
              <DropdownMenuItem>Integrations</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem>Export ZIP</DropdownMenuItem>
              <DropdownMenuItem>Share link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-secondary font-mono">£0.03 spend</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 font-medium rounded-md">
                Publish
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-surface-raised border-border">
              <DropdownMenuItem>Deploy to instancly.app</DropdownMenuItem>
              <DropdownMenuItem>Connect custom domain</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem>Export as ZIP</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <button className="px-3 py-1.5 rounded-full bg-background border border-border text-xs font-mono font-medium hover:bg-surface-raised transition-colors">
                £{mockUser.balance.toFixed(2)}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 bg-surface-raised border-border p-4">
              <h4 className="font-medium mb-2">Current Balance</h4>
              <div className="text-2xl font-mono mb-4">£{mockUser.balance.toFixed(2)}</div>
              <Link href="/dashboard/billing">
                <Button className="w-full text-xs" variant="outline">Manage Billing</Button>
              </Link>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Panel - Chat */}
        <div className="w-[340px] shrink-0 border-r border-border bg-surface flex flex-col h-full z-10 relative">
          <div className="p-3 border-b border-border">
            <select className="w-full bg-background border border-border rounded-md text-xs px-2 py-1.5 text-foreground font-mono focus:ring-1 focus:ring-primary outline-none">
              {mockModels.map(m => (
                <option key={m.name} value={m.name}>{m.name} ({m.costRange})</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            <div className="text-xs text-secondary border border-border bg-background rounded-md p-2 cursor-pointer hover:bg-surface-raised">
              ▶ Build #3 — 5 mins ago
            </div>
            
            {/* Activities */}
            <div className="flex flex-col gap-3">
              {activities.map((act) => {
                const Icon = act.icon;
                return (
                  <div key={act.id} className="flex items-start gap-3 text-sm font-mono">
                    <Icon className={`w-4 h-4 mt-0.5 ${act.color}`} />
                    <span className="text-secondary leading-snug">{act.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-border bg-surface sticky bottom-0">
            <div className="relative">
              <textarea 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Describe your app..."
                className="w-full min-h-[80px] max-h-[200px] bg-background border border-border rounded-lg p-3 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <button 
                onClick={handleSend}
                disabled={!chatInput.trim() || isStreaming}
                className="absolute right-2 bottom-2 w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[10px] text-secondary text-center mt-2">Enter to send, Shift+Enter for newline</div>
          </div>
        </div>

        {/* History Sheet */}
        <div className={`absolute top-0 bottom-0 left-[340px] w-80 bg-surface border-r border-border z-20 transition-transform duration-300 ease-in-out ${activePanel === 'history' ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
          <div className="h-12 border-b border-border flex items-center justify-between px-4">
            <h3 className="font-bold text-sm">Build History</h3>
            <button onClick={() => setActivePanel("none")} className="text-secondary hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-3rem)]">
            {[5, 4, 3, 2, 1].map(num => (
              <div key={num} className="border border-border bg-background rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm">Build #{num}</div>
                  <div className="text-xs text-secondary">{num * 10} mins ago</div>
                </div>
                <div className="text-xs text-secondary font-mono mb-3">Cost: £0.0{Math.floor(Math.random()*5)+1}</div>
                <Button size="sm" variant="outline" className="w-full text-xs h-7">Restore</Button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Preview Area */}
        <div className="flex-1 bg-[#000000] flex flex-col relative overflow-hidden z-0">
          <div className="flex-1 p-8 flex items-center justify-center overflow-hidden relative">
             <div 
               className="bg-white w-full h-full flex flex-col transition-all duration-200 ease-in-out"
               style={{ 
                 maxWidth: viewport === 'desktop' ? '100%' : viewport === 'tablet' ? '768px' : '390px',
                 maxHeight: viewport === 'mobile' ? '844px' : '100%'
               }}
             >
                {/* Fake App iframe content */}
                <div className="border-b border-gray-200 px-4 py-2 flex items-center shadow-sm">
                   <div className="font-bold text-black text-sm">Todo App</div>
                </div>
                <div className="flex-1 p-6 bg-gray-50 flex justify-center text-black overflow-y-auto">
                   <div className="w-full max-w-md bg-white p-6 rounded shadow-sm border border-gray-200 h-fit">
                      <h2 className="text-xl font-bold mb-4">Tasks</h2>
                      <div className="flex gap-2 mb-4">
                        <input type="text" className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Add task" />
                        <button className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 transition-colors">Add</button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 border-b">
                           <input type="checkbox" defaultChecked />
                           <span className="line-through text-gray-500 text-sm">Design DB schema</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 border-b">
                           <input type="checkbox" />
                           <span className="text-sm">Implement auth</span>
                        </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Code Sheet overlay */}
             <div className={`absolute top-0 bottom-0 right-0 w-[500px] bg-surface border-l border-border transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${activeFile ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-10 border-b border-border flex items-center justify-between px-4 bg-surface-raised shrink-0">
                  <div className="font-mono text-sm text-secondary flex items-center gap-2">
                    <FileCode2 className="w-4 h-4" /> {activeFile}
                  </div>
                  <button onClick={() => setActiveFile(null)} className="text-secondary hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                  <pre className="font-mono text-xs text-secondary leading-relaxed">
{`import { useState } from "react";

export default function Page() {
  const [tasks, setTasks] = useState([]);
  
  return (
    <div className="p-4">
      <h1 className="text-xl">Tasks</h1>
      {/* Implementation */}
    </div>
  );
}`}
                  </pre>
                </div>
             </div>
          </div>

          {/* Bottom Bar */}
          <div className="h-10 border-t border-border bg-surface flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-1">
              <ViewportBtn active={viewport==='desktop'} icon={Monitor} onClick={()=>setViewport('desktop')} />
              <ViewportBtn active={viewport==='tablet'} icon={Tablet} onClick={()=>setViewport('tablet')} />
              <ViewportBtn active={viewport==='mobile'} icon={Smartphone} onClick={()=>setViewport('mobile')} />
            </div>
            
            <div className="flex items-center gap-2 text-xs font-mono text-secondary hover:text-foreground cursor-pointer transition-colors px-2 py-1 rounded hover:bg-surface-raised" onClick={copyUrl}>
              {slug}-{username}.instancly.app
              <Copy className="w-3 h-3" />
            </div>

            <div className="flex items-center">
               <a href="#" className="w-8 h-8 rounded flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors">
                  <ExternalLink className="w-4 h-4" />
               </a>
            </div>
          </div>
        </div>

        {/* Database Drawer Overlay (Slides down over the main area) */}
        {activePanel === 'database' && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-30 flex flex-col pt-12 animate-in fade-in duration-200">
            <div className="bg-surface border-b border-border shadow-2xl flex flex-col h-[500px]">
              <div className="h-12 border-b border-border flex items-center px-6 gap-6">
                <h2 className="font-bold">Neon Database</h2>
                <div className="flex items-center gap-4 text-sm font-medium">
                  <span className="text-primary border-b-2 border-primary py-3">Overview</span>
                  <span className="text-secondary hover:text-foreground cursor-pointer py-3">Tables</span>
                  <span className="text-secondary hover:text-foreground cursor-pointer py-3">SQL Runner</span>
                </div>
                <button onClick={() => setActivePanel("none")} className="ml-auto text-secondary hover:text-foreground w-8 h-8 flex justify-center items-center rounded hover:bg-surface-raised">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div className="p-4 border border-border bg-background rounded-lg">
                    <div className="text-secondary text-xs mb-1">Tables</div>
                    <div className="text-2xl font-mono">4</div>
                  </div>
                  <div className="p-4 border border-border bg-background rounded-lg">
                    <div className="text-secondary text-xs mb-1">Total Rows</div>
                    <div className="text-2xl font-mono">1,042</div>
                  </div>
                  <div className="p-4 border border-border bg-background rounded-lg">
                    <div className="text-secondary text-xs mb-1">Storage</div>
                    <div className="text-2xl font-mono">2.4 MB</div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium mb-2">Connection String</div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-background border border-border rounded-md px-3 py-2 font-mono text-sm text-secondary truncate select-all">
                      postgres://user:••••••••@ep-cool-db.neon.tech/main
                    </div>
                    <Button variant="outline" onClick={copyDbUrl} className="border-border hover:bg-surface-raised">
                      <Copy className="w-4 h-4 mr-2" /> Copy
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Files Dropdown (Absolute positioned below navbar) */}
      {activePanel === 'files' && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-80 bg-surface border border-border rounded-b-lg shadow-2xl z-40 p-2 text-sm font-mono text-secondary animate-in slide-in-from-top-2 duration-200">
          <div className="font-sans font-bold text-foreground px-2 py-1 mb-2 border-b border-border">Files</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-raised rounded cursor-pointer text-foreground">
              <FolderClosed className="w-4 h-4" /> src
            </div>
            <div className="ml-4 space-y-1">
              <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-raised rounded cursor-pointer" onClick={() => { setActiveFile("src/app/page.tsx"); setActivePanel("none"); }}>
                <FileCode2 className="w-4 h-4" /> app/page.tsx
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-raised rounded cursor-pointer" onClick={() => { setActiveFile("src/components/ui/button.tsx"); setActivePanel("none"); }}>
                <FileCode2 className="w-4 h-4" /> components/ui/button.tsx
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-raised rounded cursor-pointer" onClick={() => { setActiveFile("src/lib/db.ts"); setActivePanel("none"); }}>
                <FileCode2 className="w-4 h-4" /> lib/db.ts
              </div>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-raised rounded cursor-pointer text-foreground">
              <FileCode2 className="w-4 h-4" /> package.json
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-raised rounded cursor-pointer text-foreground">
              <FileCode2 className="w-4 h-4" /> tailwind.config.ts
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-surface border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
            <DialogDescription>
              Configure your project settings and domains.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input id="name" defaultValue="Todo App" className="bg-background border-border" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" defaultValue="todo-app" className="bg-background border-border font-mono" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="domain">Custom Domain</Label>
              <Input id="domain" placeholder="app.example.com" className="bg-background border-border font-mono" />
            </div>
            <div className="flex items-center justify-between pt-4">
              <Label htmlFor="public" className="flex flex-col gap-1">
                <span>Public Project</span>
                <span className="font-normal text-xs text-secondary">Allow others to view and clone.</span>
              </Label>
              <Switch id="public" defaultChecked />
            </div>
            <div className="border border-error/20 rounded-lg p-4 bg-error/5 mt-4">
              <h4 className="text-error font-medium text-sm mb-2">Danger Zone</h4>
              <Button variant="destructive" className="w-full text-xs h-8">Delete Project</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)} className="border-border">Cancel</Button>
            <Button onClick={() => { setIsSettingsOpen(false); toast.success("Settings saved"); }} className="bg-primary text-primary-foreground hover:bg-primary/90">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function NavIconButton({ icon: Icon, tooltip, active, onClick }: { icon: any, tooltip: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-8 h-8 rounded-[6px] flex items-center justify-center transition-colors duration-150 relative group
        ${active ? 'text-primary bg-primary/15' : 'text-secondary hover:text-[#888] hover:bg-surface-raised'}
      `}
    >
      <Icon className="w-5 h-5" />
      {/* css tooltip */}
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 delay-500 whitespace-nowrap border border-border">
        {tooltip}
      </div>
    </button>
  );
}

function ViewportBtn({ active, icon: Icon, onClick }: { active: boolean, icon: any, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${active ? 'text-primary bg-primary/15' : 'text-secondary hover:text-[#888] hover:bg-surface-raised'}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

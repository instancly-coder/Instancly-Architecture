import { Link, useParams } from "wouter";
import { Flame, MapPin, Link as LinkIcon, Calendar } from "lucide-react";
import { mockUser, mockProjects } from "@/lib/mock-data";

export default function Profile() {
  const { username } = useParams();
  // using mockUser for any profile
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-surface h-14 flex items-center px-6 sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 mr-8">
          <Flame className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tight">instancly</span>
        </Link>
        <div className="flex items-center gap-6 text-sm ml-auto">
          <Link href="/dashboard" className="text-secondary hover:text-foreground">Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-8">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Sidebar */}
          <div className="w-full md:w-64 shrink-0">
            <div className="w-32 h-32 rounded-full bg-surface border border-border flex items-center justify-center text-4xl font-bold mb-4">
              {username?.[0].toUpperCase() || "U"}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{mockUser.displayName}</h1>
            <div className="text-secondary font-mono text-sm mb-4">@{username}</div>
            <p className="text-sm mb-6">{mockUser.bio}</p>
            
            <div className="space-y-2 text-sm text-secondary">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Joined Nov 2023
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-secondary">Public Projects</span>
                <span className="font-mono font-medium">{mockUser.publicProjects}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary">Total Clones</span>
                <span className="font-mono font-medium">{mockUser.totalClones}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="border-b border-border pb-4 mb-6">
              <h2 className="text-lg font-bold">Public Projects</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {mockProjects.map(project => (
                <Link key={project.id} href={`/${username}/${project.slug}`}>
                  <div className="border border-border bg-surface rounded-xl p-5 hover-elevate cursor-pointer h-full flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-lg">{project.name}</h3>
                      <div className="text-xs px-2 py-0.5 rounded bg-background border border-border">
                        {project.framework}
                      </div>
                    </div>
                    <div className="text-sm text-secondary mb-6 flex-1">
                      {project.description}
                    </div>
                    <div className="flex items-center justify-between text-xs text-secondary mt-auto pt-4 border-t border-border/50">
                      <span>{project.clones} clones</span>
                      <span>Updated {project.lastActive}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
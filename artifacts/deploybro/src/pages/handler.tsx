import { StackHandler } from "@stackframe/react";
import { stackApp, stackConfigured } from "@/stack";

export default function Handler() {
  if (!stackConfigured || !stackApp) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-secondary">
        Authentication is not configured.
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <StackHandler
          app={stackApp}
          location={window.location.pathname + window.location.search}
          fullPage={false}
        />
      </div>
    </div>
  );
}

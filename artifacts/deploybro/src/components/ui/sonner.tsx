"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = (props: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      expand
      richColors={false}
      closeButton
      visibleToasts={4}
      gap={10}
      offset={20}
      duration={5000}
      className="deploybro-toaster"
      style={
        {
          ["--toast-radius" as string]: "var(--radius)",
          fontFamily: "var(--app-font-sans)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: [
            "group/toast deploybro-toast",
            "border border-card-border bg-popover text-popover-foreground",
            "shadow-[0_8px_30px_-8px_rgb(0_0_0_/_0.25)]",
            "backdrop-blur-md",
            "rounded-[var(--radius)]",
            "px-4 py-3 gap-3",
            "data-[type=success]:border-l-4 data-[type=success]:border-l-[hsl(var(--success))]",
            "data-[type=error]:border-l-4 data-[type=error]:border-l-[hsl(var(--destructive))]",
            "data-[type=warning]:border-l-4 data-[type=warning]:border-l-[hsl(45_93%_47%)]",
            "data-[type=info]:border-l-4 data-[type=info]:border-l-[hsl(var(--primary))]",
            "data-[type=loading]:border-l-4 data-[type=loading]:border-l-[hsl(var(--primary))]",
          ].join(" "),
          title:
            "text-sm font-medium tracking-tight text-popover-foreground leading-snug",
          description:
            "text-xs text-muted-foreground leading-relaxed mt-0.5",
          actionButton:
            "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-[calc(var(--radius)-2px)] px-2.5 py-1 text-xs font-medium",
          cancelButton:
            "bg-surface-raised text-secondary hover:text-foreground hover:bg-surface-raised/80 transition-colors rounded-[calc(var(--radius)-2px)] px-2.5 py-1 text-xs font-medium",
          closeButton:
            "!bg-transparent !border-0 !text-muted-foreground hover:!text-foreground !left-auto !right-2 !top-2 transition-colors",
          icon: "text-current shrink-0",
          success:
            "[&_[data-icon]]:text-[hsl(var(--success))]",
          error:
            "[&_[data-icon]]:text-[hsl(var(--destructive))]",
          warning:
            "[&_[data-icon]]:text-[hsl(45_93%_47%)]",
          info: "[&_[data-icon]]:text-[hsl(var(--primary))]",
          loading:
            "[&_[data-icon]]:text-[hsl(var(--primary))]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

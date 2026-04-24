// Mirror of artifacts/instancly/src/lib/components-catalog.ts — the AI's known
// building blocks. Keep these two files in sync.

export type LibraryComponent = {
  name: string;
  importPath: string;
  category: string;
  description: string;
};

export const COMPONENT_LIBRARY: LibraryComponent[] = [
  { name: "Input", importPath: "@/components/ui/input", category: "Inputs", description: "Single-line text input." },
  { name: "Textarea", importPath: "@/components/ui/textarea", category: "Inputs", description: "Multi-line text area." },
  { name: "Label", importPath: "@/components/ui/label", category: "Inputs", description: "Accessible form label." },
  { name: "Checkbox", importPath: "@/components/ui/checkbox", category: "Inputs", description: "Boolean checkbox." },
  { name: "RadioGroup", importPath: "@/components/ui/radio-group", category: "Inputs", description: "Mutually exclusive option group." },
  { name: "Switch", importPath: "@/components/ui/switch", category: "Inputs", description: "Toggle switch." },
  { name: "Slider", importPath: "@/components/ui/slider", category: "Inputs", description: "Range slider." },
  { name: "Select", importPath: "@/components/ui/select", category: "Inputs", description: "Dropdown select." },
  { name: "Form", importPath: "@/components/ui/form", category: "Inputs", description: "react-hook-form bindings." },
  { name: "InputOTP", importPath: "@/components/ui/input-otp", category: "Inputs", description: "One-time password input." },
  { name: "Calendar", importPath: "@/components/ui/calendar", category: "Inputs", description: "Date picker calendar." },
  { name: "ToggleGroup", importPath: "@/components/ui/toggle-group", category: "Inputs", description: "Group of toggle buttons." },
  { name: "Toggle", importPath: "@/components/ui/toggle", category: "Inputs", description: "Single toggle button." },
  { name: "Button", importPath: "@/components/ui/button", category: "Buttons", description: "Primary button with variants." },
  { name: "ButtonGroup", importPath: "@/components/ui/button-group", category: "Buttons", description: "Visually grouped buttons." },
  { name: "Card", importPath: "@/components/ui/card", category: "Display", description: "Bordered surface for content." },
  { name: "Avatar", importPath: "@/components/ui/avatar", category: "Display", description: "User avatar with fallback." },
  { name: "Badge", importPath: "@/components/ui/badge", category: "Display", description: "Small status pill." },
  { name: "Separator", importPath: "@/components/ui/separator", category: "Display", description: "Visual divider line." },
  { name: "Skeleton", importPath: "@/components/ui/skeleton", category: "Display", description: "Loading placeholder shimmer." },
  { name: "AspectRatio", importPath: "@/components/ui/aspect-ratio", category: "Display", description: "Maintains a width/height ratio." },
  { name: "Kbd", importPath: "@/components/ui/kbd", category: "Display", description: "Keyboard key indicator." },
  { name: "Item", importPath: "@/components/ui/item", category: "Display", description: "List item primitive." },
  { name: "Empty", importPath: "@/components/ui/empty", category: "Display", description: "Empty-state container." },
  { name: "Alert", importPath: "@/components/ui/alert", category: "Feedback", description: "Inline alert message." },
  { name: "Progress", importPath: "@/components/ui/progress", category: "Feedback", description: "Linear progress bar." },
  { name: "Spinner", importPath: "@/components/ui/spinner", category: "Feedback", description: "Animated loading spinner." },
  { name: "Sonner", importPath: "@/components/ui/sonner", category: "Feedback", description: "Toast notifications via sonner." },
  { name: "Toast", importPath: "@/components/ui/toast", category: "Feedback", description: "Imperative toast primitive." },
  { name: "Tabs", importPath: "@/components/ui/tabs", category: "Navigation", description: "Tabbed content panels." },
  { name: "Breadcrumb", importPath: "@/components/ui/breadcrumb", category: "Navigation", description: "Page-path breadcrumbs." },
  { name: "NavigationMenu", importPath: "@/components/ui/navigation-menu", category: "Navigation", description: "Top-level nav menu." },
  { name: "Menubar", importPath: "@/components/ui/menubar", category: "Navigation", description: "Desktop-style menu bar." },
  { name: "Pagination", importPath: "@/components/ui/pagination", category: "Navigation", description: "Page number controls." },
  { name: "Sidebar", importPath: "@/components/ui/sidebar", category: "Navigation", description: "Collapsible app sidebar." },
  { name: "Dialog", importPath: "@/components/ui/dialog", category: "Overlays", description: "Modal dialog window." },
  { name: "AlertDialog", importPath: "@/components/ui/alert-dialog", category: "Overlays", description: "Confirmation dialog." },
  { name: "Sheet", importPath: "@/components/ui/sheet", category: "Overlays", description: "Slide-in panel from edge." },
  { name: "Drawer", importPath: "@/components/ui/drawer", category: "Overlays", description: "Bottom drawer (mobile)." },
  { name: "Popover", importPath: "@/components/ui/popover", category: "Overlays", description: "Floating popover panel." },
  { name: "Tooltip", importPath: "@/components/ui/tooltip", category: "Overlays", description: "Hover tooltip." },
  { name: "HoverCard", importPath: "@/components/ui/hover-card", category: "Overlays", description: "Rich hover preview card." },
  { name: "DropdownMenu", importPath: "@/components/ui/dropdown-menu", category: "Overlays", description: "Action dropdown menu." },
  { name: "ContextMenu", importPath: "@/components/ui/context-menu", category: "Overlays", description: "Right-click context menu." },
  { name: "Command", importPath: "@/components/ui/command", category: "Overlays", description: "⌘K command palette." },
  { name: "ScrollArea", importPath: "@/components/ui/scroll-area", category: "Layout", description: "Custom-scrollbar container." },
  { name: "Resizable", importPath: "@/components/ui/resizable", category: "Layout", description: "Resizable split panels." },
  { name: "Collapsible", importPath: "@/components/ui/collapsible", category: "Layout", description: "Toggleable show/hide region." },
  { name: "Accordion", importPath: "@/components/ui/accordion", category: "Layout", description: "Vertically stacked collapsibles." },
  { name: "Carousel", importPath: "@/components/ui/carousel", category: "Layout", description: "Horizontal slide carousel." },
  { name: "InputGroup", importPath: "@/components/ui/input-group", category: "Layout", description: "Group inputs with addons." },
  { name: "Field", importPath: "@/components/ui/field", category: "Layout", description: "Form field wrapper." },
  { name: "Table", importPath: "@/components/ui/table", category: "Data", description: "Standard data table." },
  { name: "Chart", importPath: "@/components/ui/chart", category: "Data", description: "Recharts wrapper for charts." },
];

export function buildSystemPrompt(projectName: string, framework: string): string {
  const list = COMPONENT_LIBRARY.map(
    (c) => `- ${c.name} (${c.importPath}) — ${c.description}`,
  ).join("\n");

  return `You are Instancly, an AI app builder helping a user iterate on the project "${projectName}" (${framework}).

You have a curated component library available. PREFER these components over hand-rolling HTML/CSS:

${list}

When the user asks for a feature:
1. Briefly explain your plan in 1–2 sentences.
2. Walk through the changes you'd make, calling out which library components you'd reuse.
3. Provide concise code snippets only for the new/changed parts.

Stay practical and focused. Don't over-explain. Don't show entire files unless needed.`;
}

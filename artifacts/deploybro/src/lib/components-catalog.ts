// The Component Library — the canonical list of building blocks the AI can use
// when generating apps. Both the /library UI and the backend system prompt read
// from this file (the API server has a mirror at api-server/src/lib/components-catalog.ts).

export type ComponentCategory =
  | "Inputs"
  | "Buttons"
  | "Display"
  | "Feedback"
  | "Navigation"
  | "Layout"
  | "Overlays"
  | "Data";

export type LibraryComponent = {
  name: string;
  importPath: string;
  category: ComponentCategory;
  description: string;
  example: string;
};

export const COMPONENT_LIBRARY: LibraryComponent[] = [
  // ---- Inputs ----
  { name: "Input", importPath: "@/components/ui/input", category: "Inputs", description: "Single-line text input.", example: `<Input placeholder="Email" />` },
  { name: "Textarea", importPath: "@/components/ui/textarea", category: "Inputs", description: "Multi-line text area.", example: `<Textarea placeholder="Tell us more" />` },
  { name: "Label", importPath: "@/components/ui/label", category: "Inputs", description: "Accessible form label.", example: `<Label htmlFor="email">Email</Label>` },
  { name: "Checkbox", importPath: "@/components/ui/checkbox", category: "Inputs", description: "Boolean checkbox.", example: `<Checkbox id="agree" />` },
  { name: "RadioGroup", importPath: "@/components/ui/radio-group", category: "Inputs", description: "Mutually exclusive option group.", example: `<RadioGroup defaultValue="a"><RadioGroupItem value="a" /></RadioGroup>` },
  { name: "Switch", importPath: "@/components/ui/switch", category: "Inputs", description: "Toggle switch.", example: `<Switch />` },
  { name: "Slider", importPath: "@/components/ui/slider", category: "Inputs", description: "Range slider.", example: `<Slider defaultValue={[50]} max={100} />` },
  { name: "Select", importPath: "@/components/ui/select", category: "Inputs", description: "Dropdown select.", example: `<Select><SelectTrigger><SelectValue /></SelectTrigger></Select>` },
  { name: "Form", importPath: "@/components/ui/form", category: "Inputs", description: "react-hook-form bindings.", example: `<Form {...form}>...</Form>` },
  { name: "InputOTP", importPath: "@/components/ui/input-otp", category: "Inputs", description: "One-time password input.", example: `<InputOTP maxLength={6}>...</InputOTP>` },
  { name: "Calendar", importPath: "@/components/ui/calendar", category: "Inputs", description: "Date picker calendar.", example: `<Calendar mode="single" />` },
  { name: "ToggleGroup", importPath: "@/components/ui/toggle-group", category: "Inputs", description: "Group of toggle buttons.", example: `<ToggleGroup type="single">...</ToggleGroup>` },
  { name: "Toggle", importPath: "@/components/ui/toggle", category: "Inputs", description: "Single toggle button.", example: `<Toggle>Bold</Toggle>` },

  // ---- Buttons ----
  { name: "Button", importPath: "@/components/ui/button", category: "Buttons", description: "Primary button with variants.", example: `<Button>Click me</Button>` },
  { name: "ButtonGroup", importPath: "@/components/ui/button-group", category: "Buttons", description: "Visually grouped buttons.", example: `<ButtonGroup>...</ButtonGroup>` },

  // ---- Display ----
  { name: "Card", importPath: "@/components/ui/card", category: "Display", description: "Bordered surface for content.", example: `<Card><CardHeader>...</CardHeader></Card>` },
  { name: "Avatar", importPath: "@/components/ui/avatar", category: "Display", description: "User avatar with fallback.", example: `<Avatar><AvatarImage src="..." /></Avatar>` },
  { name: "Badge", importPath: "@/components/ui/badge", category: "Display", description: "Small status pill.", example: `<Badge variant="secondary">New</Badge>` },
  { name: "Separator", importPath: "@/components/ui/separator", category: "Display", description: "Visual divider line.", example: `<Separator />` },
  { name: "Skeleton", importPath: "@/components/ui/skeleton", category: "Display", description: "Loading placeholder shimmer.", example: `<Skeleton className="h-8 w-32" />` },
  { name: "AspectRatio", importPath: "@/components/ui/aspect-ratio", category: "Display", description: "Maintains a width/height ratio.", example: `<AspectRatio ratio={16/9}>...</AspectRatio>` },
  { name: "Kbd", importPath: "@/components/ui/kbd", category: "Display", description: "Keyboard key indicator.", example: `<Kbd>⌘K</Kbd>` },
  { name: "Item", importPath: "@/components/ui/item", category: "Display", description: "List item primitive.", example: `<Item>Row</Item>` },
  { name: "Empty", importPath: "@/components/ui/empty", category: "Display", description: "Empty-state container.", example: `<Empty title="No results" />` },

  // ---- Feedback ----
  { name: "Alert", importPath: "@/components/ui/alert", category: "Feedback", description: "Inline alert message.", example: `<Alert><AlertTitle>Heads up</AlertTitle></Alert>` },
  { name: "Progress", importPath: "@/components/ui/progress", category: "Feedback", description: "Linear progress bar.", example: `<Progress value={66} />` },
  { name: "Spinner", importPath: "@/components/ui/spinner", category: "Feedback", description: "Animated loading spinner.", example: `<Spinner />` },
  { name: "Sonner", importPath: "@/components/ui/sonner", category: "Feedback", description: "Toast notifications via sonner.", example: `toast.success("Saved")` },
  { name: "Toast", importPath: "@/components/ui/toast", category: "Feedback", description: "Imperative toast primitive.", example: `<Toaster />` },

  // ---- Navigation ----
  { name: "Tabs", importPath: "@/components/ui/tabs", category: "Navigation", description: "Tabbed content panels.", example: `<Tabs defaultValue="a"><TabsList>...</TabsList></Tabs>` },
  { name: "Breadcrumb", importPath: "@/components/ui/breadcrumb", category: "Navigation", description: "Page-path breadcrumbs.", example: `<Breadcrumb><BreadcrumbList>...</BreadcrumbList></Breadcrumb>` },
  { name: "NavigationMenu", importPath: "@/components/ui/navigation-menu", category: "Navigation", description: "Top-level nav menu.", example: `<NavigationMenu>...</NavigationMenu>` },
  { name: "Menubar", importPath: "@/components/ui/menubar", category: "Navigation", description: "Desktop-style menu bar.", example: `<Menubar>...</Menubar>` },
  { name: "Pagination", importPath: "@/components/ui/pagination", category: "Navigation", description: "Page number controls.", example: `<Pagination>...</Pagination>` },
  { name: "Sidebar", importPath: "@/components/ui/sidebar", category: "Navigation", description: "Collapsible app sidebar.", example: `<Sidebar>...</Sidebar>` },

  // ---- Overlays ----
  { name: "Dialog", importPath: "@/components/ui/dialog", category: "Overlays", description: "Modal dialog window.", example: `<Dialog><DialogContent>...</DialogContent></Dialog>` },
  { name: "AlertDialog", importPath: "@/components/ui/alert-dialog", category: "Overlays", description: "Confirmation dialog.", example: `<AlertDialog>...</AlertDialog>` },
  { name: "Sheet", importPath: "@/components/ui/sheet", category: "Overlays", description: "Slide-in panel from edge.", example: `<Sheet><SheetContent>...</SheetContent></Sheet>` },
  { name: "Drawer", importPath: "@/components/ui/drawer", category: "Overlays", description: "Bottom drawer (mobile).", example: `<Drawer><DrawerContent>...</DrawerContent></Drawer>` },
  { name: "Popover", importPath: "@/components/ui/popover", category: "Overlays", description: "Floating popover panel.", example: `<Popover><PopoverContent>...</PopoverContent></Popover>` },
  { name: "Tooltip", importPath: "@/components/ui/tooltip", category: "Overlays", description: "Hover tooltip.", example: `<Tooltip>...</Tooltip>` },
  { name: "HoverCard", importPath: "@/components/ui/hover-card", category: "Overlays", description: "Rich hover preview card.", example: `<HoverCard>...</HoverCard>` },
  { name: "DropdownMenu", importPath: "@/components/ui/dropdown-menu", category: "Overlays", description: "Action dropdown menu.", example: `<DropdownMenu>...</DropdownMenu>` },
  { name: "ContextMenu", importPath: "@/components/ui/context-menu", category: "Overlays", description: "Right-click context menu.", example: `<ContextMenu>...</ContextMenu>` },
  { name: "Command", importPath: "@/components/ui/command", category: "Overlays", description: "⌘K command palette.", example: `<Command>...</Command>` },

  // ---- Layout ----
  { name: "ScrollArea", importPath: "@/components/ui/scroll-area", category: "Layout", description: "Custom-scrollbar container.", example: `<ScrollArea className="h-72">...</ScrollArea>` },
  { name: "Resizable", importPath: "@/components/ui/resizable", category: "Layout", description: "Resizable split panels.", example: `<ResizablePanelGroup>...</ResizablePanelGroup>` },
  { name: "Collapsible", importPath: "@/components/ui/collapsible", category: "Layout", description: "Toggleable show/hide region.", example: `<Collapsible>...</Collapsible>` },
  { name: "Accordion", importPath: "@/components/ui/accordion", category: "Layout", description: "Vertically stacked collapsibles.", example: `<Accordion type="single">...</Accordion>` },
  { name: "Carousel", importPath: "@/components/ui/carousel", category: "Layout", description: "Horizontal slide carousel.", example: `<Carousel>...</Carousel>` },
  { name: "InputGroup", importPath: "@/components/ui/input-group", category: "Layout", description: "Group inputs with addons.", example: `<InputGroup>...</InputGroup>` },
  { name: "Field", importPath: "@/components/ui/field", category: "Layout", description: "Form field wrapper.", example: `<Field>...</Field>` },

  // ---- Data ----
  { name: "Table", importPath: "@/components/ui/table", category: "Data", description: "Standard data table.", example: `<Table><TableHeader>...</TableHeader></Table>` },
  { name: "Chart", importPath: "@/components/ui/chart", category: "Data", description: "Recharts wrapper for charts.", example: `<ChartContainer>...</ChartContainer>` },
];

export const CATEGORY_ORDER: ComponentCategory[] = [
  "Inputs",
  "Buttons",
  "Display",
  "Feedback",
  "Navigation",
  "Overlays",
  "Layout",
  "Data",
];

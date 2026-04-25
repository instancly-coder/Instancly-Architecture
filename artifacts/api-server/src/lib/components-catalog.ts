// Mirror of artifacts/deploybro/src/lib/components-catalog.ts — the AI's known
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
  return `You are DeployBro, a friendly AI app builder helping a user iterate on the project "${projectName}" (${framework}).

# How you communicate

The user sees TWO things:
1. **Your chat reply** — plain-English conversation, like a teammate explaining what they're doing.
2. **The rendered preview** — an iframe that loads the project's "index.html". They can also browse the file tree separately.

Your chat reply is for the human. The actual code goes in special file blocks (described below) that the user does NOT see in chat — those are stripped out and applied directly to the project. So:

- ✅ DO talk like a person. "I'll add a dark mode toggle in the top-right and persist the choice in localStorage so it sticks across reloads."
- ✅ DO briefly explain WHAT you're changing and WHY, in 1–4 short sentences or a short bulleted list.
- ✅ DO mention which files you touched at the end if it's helpful (e.g. "Updated \`index.html\` and \`app.jsx\`.").
- ❌ DO NOT paste code snippets, code fences (\`\`\`), JSX, CSS, or HTML into the chat reply. The file blocks already deliver the code — repeating it in chat is noisy and hides the actual explanation.
- ❌ DO NOT narrate the file blocks ("Here's the index.html:" followed by code). Just talk to the user, then emit the file blocks.
- ❌ DO NOT show diffs, before/after blocks, or "the change is…" code samples. Describe the change in words.

Tone: warm, concise, confident. Short paragraphs. No filler ("Great question!", "Certainly!"). No emojis unless the user uses them first.

# How you ship code

You generate a self-contained single-page web app that runs directly in a sandboxed iframe — there is NO build step, NO bundler, and NO server.

To change files, emit one or more XML-style file blocks. The body of each block is the COMPLETE file contents that will replace the file on disk:

<file path="index.html">
…full contents…
</file>

<file path="app.jsx">
…full contents…
</file>

Rules for file blocks:
- ALWAYS include "index.html" as the entry point. The iframe loads it directly.
- Reference any sibling files via relative URLs (e.g. \`<script type="text/babel" src="app.jsx"></script>\`, \`<link rel="stylesheet" href="styles.css">\`).
- Use these exact CDNs in index.html:
  • Tailwind v4 (CDN): \`<script src="https://cdn.tailwindcss.com"></script>\`
  • React 18: \`<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>\` and \`<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>\`
  • Babel standalone (so .jsx files Just Work): \`<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\`
- Mount React into a \`<div id="root"></div>\` from a JSX file loaded with \`<script type="text/babel" data-presets="react" src="app.jsx"></script>\`.
- Allowed file extensions: .html, .jsx, .js, .css, .json, .svg, .md
- File paths use forward slashes, no leading slash, no "..", e.g. "index.html" or "components/TaskList.jsx".
- Any file you DON'T emit is left untouched. Re-emit a file ONLY when you want to change it. For tiny tweaks, only re-emit the affected file.
- The runtime is just the browser globals from the CDNs above (\`React\`, \`ReactDOM\`). Don't reference npm packages or ES module imports.
- Use Tailwind utility classes for styling.

# Style guidance for the generated app

The fastest way to make work look generic is to default to the same AI-builder template every time: indigo-on-slate, rounded-2xl cards, pill buttons, lucide icons, gradient blobs, "We deliver excellence" copy. Don't do that. Make confident, opinionated design decisions tailored to the brief.

Concretely:

- **Layout & rhythm.** Pages should fill the viewport top-to-bottom with 5–8 substantial sections, not 2. Vary section backgrounds — alternate light / dark / tinted bands — so the page feels composed instead of flat. Use real visual hierarchy: oversized display type for headlines, small uppercase labels, generous whitespace.
- **Colour.** Pick ONE coherent palette appropriate to the audience. Lean bold when the brief calls for it (trades, fitness, events, agencies). Lean refined for medical, real estate, restaurant. Avoid pastel-everywhere unless the brief is a kids brand or wellness.
- **Typography.** Pair ONE distinctive headline face with ONE clean body face. Use Google Fonts via a \`<link>\` in the head. Examples that aren't boring: Inter Display + Inter, Fraunces + Inter, Playfair + Source Sans, Bebas Neue + Inter, Cormorant + Lora, Anton + Archivo. Don't ship the system font stack as the only choice.
- **Imagery.** When you need a real photo, use Unsplash featured URLs: \`https://source.unsplash.com/featured/?KEYWORD1,KEYWORD2\`. Pick keywords that match the vertical (e.g. "plumber,van,tools"; "espresso,cafe,latte-art"; "modern home interior, kitchen"). For decorative shapes, use inline SVG with the page's accent colour, not generic gradient blobs.
- **Copy.** Write specific, plausible content — invented names, prices, locations, hours, testimonials with personas. Never lorem ipsum, never "Your tagline here", never "Innovative solutions / Cutting-edge / We deliver excellence".
- **Accessibility.** Real labels on inputs, button semantics, visible focus states, sufficient colour contrast, alt text on images.
- **Mobile.** Design mobile-first. Sticky CTAs (call / book / buy) on mobile when the page is conversion-focused. Test mentally at 375px wide.

When in doubt, ask yourself: would this look in place on the homepage of a real, launched product in this category? If the answer is "it looks AI-generated", redesign with bolder, more specific choices.

# Recap of the format

A typical reply looks like:

> Sure — I'll add a "Clear completed" button next to the counter and wire it to remove all checked tasks. Updated \`app.jsx\`.
>
> <file path="app.jsx">…</file>

That's it. Friendly sentence, optional file mention, then the file blocks.`;
}

// Format the project's existing files as context the model can read in the
// next prompt. Truncates very large files so we stay inside the model's
// context window. Binary uploads (images, fonts, etc.) are surfaced as
// metadata-only stubs — sending raw base64 to Claude wastes tokens and
// degrades generation quality. The model still sees the path so it can
// reference uploaded assets in generated HTML/JSX (e.g. `<img src="logo.png">`).
export function buildFilesContext(
  files: Array<{
    path: string;
    content: string;
    encoding?: string | null;
    contentType?: string | null;
    size?: number | null;
  }>,
): string {
  if (files.length === 0) {
    return "There are no files yet — this is the first build for this project.";
  }
  const MAX_FILE_BYTES = 12_000;
  const blocks = files.map((f) => {
    if (f.encoding === "base64") {
      const ct = f.contentType ?? "application/octet-stream";
      const sizeLabel =
        typeof f.size === "number" ? ` ${f.size} bytes,` : "";
      return `<file path="${f.path}">\n[binary asset —${sizeLabel} ${ct} — reference by path, do not regenerate the bytes]\n</file>`;
    }
    const trimmed =
      f.content.length > MAX_FILE_BYTES
        ? f.content.slice(0, MAX_FILE_BYTES) +
          `\n…(truncated, ${f.content.length - MAX_FILE_BYTES} more chars)`
        : f.content;
    return `<file path="${f.path}">\n${trimmed}\n</file>`;
  });
  return `Current project files:\n\n${blocks.join("\n\n")}`;
}

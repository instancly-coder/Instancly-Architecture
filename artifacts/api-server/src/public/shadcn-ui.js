// DeployBro ShadcnUI — browser-ready shadcn/ui-compatible component library
// Requires: React 18 + ReactDOM already on window before this script loads.
// Exposes: window.ShadcnUI = { cn, Button, Card, Input, ... }
// Styling:  Tailwind CSS (assumed loaded from CDN). No CSS variables needed.
(function (global) {
  "use strict";
  var R = global.React;
  var RD = global.ReactDOM;
  if (!R) { console.error("[ShadcnUI] React not found. Load React before shadcn-ui.js."); return; }
  var h = R.createElement;
  var useState = R.useState;
  var useRef = R.useRef;
  var useEffect = R.useEffect;
  var useContext = R.useContext;
  var createContext = R.createContext;
  var forwardRef = R.forwardRef;
  var Fragment = R.Fragment;

  // ─── cn utility ───────────────────────────────────────────────────────────────
  function cn() {
    var args = Array.prototype.slice.call(arguments);
    return args.filter(function(c) { return c && typeof c === "string"; }).join(" ");
  }

  // ─── Button ───────────────────────────────────────────────────────────────────
  var BTN_VARIANTS = {
    default:     "bg-zinc-900 text-white shadow hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100",
    destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600",
    outline:     "border border-zinc-300 bg-white shadow-sm hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-100 dark:hover:bg-zinc-800",
    secondary:   "bg-zinc-100 text-zinc-900 shadow-sm hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700",
    ghost:       "hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
    link:        "text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50",
  };
  var BTN_SIZES = {
    default: "h-9 px-4 py-2 text-sm",
    sm:      "h-8 rounded-md px-3 text-xs",
    lg:      "h-11 rounded-md px-8 text-base",
    icon:    "h-9 w-9",
  };
  function Button(props) {
    var variant = props.variant || "default";
    var size = props.size || "default";
    var rest = Object.assign({}, props);
    delete rest.variant; delete rest.size; delete rest.className;
    return h("button", Object.assign({
      className: cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1",
        "disabled:pointer-events-none disabled:opacity-50",
        BTN_VARIANTS[variant] || BTN_VARIANTS.default,
        BTN_SIZES[size] || BTN_SIZES.default,
        props.className
      ),
    }, rest));
  }

  // ─── Badge ────────────────────────────────────────────────────────────────────
  var BADGE_VARIANTS = {
    default:     "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900",
    secondary:   "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    outline:     "border border-zinc-300 text-zinc-900 dark:border-zinc-600 dark:text-zinc-100",
    success:     "bg-emerald-500 text-white hover:bg-emerald-600",
    warning:     "bg-amber-400 text-amber-900 hover:bg-amber-500",
  };
  function Badge(props) {
    var variant = props.variant || "default";
    var rest = Object.assign({}, props); delete rest.variant; delete rest.className;
    return h("span", Object.assign({
      className: cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        BADGE_VARIANTS[variant] || BADGE_VARIANTS.default,
        props.className
      ),
    }, rest));
  }

  // ─── Card ─────────────────────────────────────────────────────────────────────
  function Card(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", Object.assign({ className: cn("rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950", props.className) }, rest));
  }
  function CardHeader(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", Object.assign({ className: cn("flex flex-col space-y-1.5 p-6", props.className) }, rest));
  }
  function CardTitle(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("h3", Object.assign({ className: cn("text-xl font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-50", props.className) }, rest));
  }
  function CardDescription(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("p", Object.assign({ className: cn("text-sm text-zinc-500 dark:text-zinc-400", props.className) }, rest));
  }
  function CardContent(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", Object.assign({ className: cn("p-6 pt-0", props.className) }, rest));
  }
  function CardFooter(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", Object.assign({ className: cn("flex items-center p-6 pt-0", props.className) }, rest));
  }

  // ─── Input / Textarea / Label ────────────────────────────────────────────────
  var INPUT_BASE = "flex h-9 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500";
  function Input(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("input", Object.assign({ className: cn(INPUT_BASE, props.className) }, rest));
  }
  function Textarea(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("textarea", Object.assign({ className: cn("flex min-h-[80px] w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500 resize-none", props.className) }, rest));
  }
  function Label(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("label", Object.assign({ className: cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", props.className) }, rest));
  }

  // ─── Separator ────────────────────────────────────────────────────────────────
  function Separator(props) {
    var orientation = props.orientation || "horizontal";
    var rest = Object.assign({}, props); delete rest.className; delete rest.orientation;
    return h("div", Object.assign({
      role: "separator",
      "aria-orientation": orientation,
      className: cn(
        "shrink-0 bg-zinc-200 dark:bg-zinc-800",
        orientation === "horizontal" ? "h-px w-full my-2" : "h-full w-px mx-2",
        props.className
      ),
    }, rest));
  }

  // ─── Skeleton ─────────────────────────────────────────────────────────────────
  function Skeleton(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", Object.assign({ className: cn("animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800", props.className) }, rest));
  }

  // ─── Avatar ───────────────────────────────────────────────────────────────────
  var AvatarCtx = createContext({ src: null, loaded: false, error: false });
  function Avatar(props) {
    var state = useState({ src: null, loaded: false, error: false });
    var rest = Object.assign({}, props); delete rest.className; delete rest.children;
    return h(AvatarCtx.Provider, { value: state[0] },
      h("span", Object.assign({
        className: cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", props.className),
      }, rest), props.children)
    );
  }
  function AvatarImage(props) {
    return h("img", Object.assign({}, props, {
      className: cn("aspect-square h-full w-full object-cover", props.className),
      onError: function(e) { e.target.style.display = "none"; },
    }));
  }
  function AvatarFallback(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("span", Object.assign({
      className: cn("flex h-full w-full items-center justify-center rounded-full bg-zinc-100 text-sm font-medium dark:bg-zinc-800 dark:text-zinc-100", props.className),
    }, rest));
  }

  // ─── Alert ────────────────────────────────────────────────────────────────────
  var ALERT_VARIANTS = {
    default:     "bg-white text-zinc-900 border-zinc-200 dark:bg-zinc-950 dark:text-zinc-50 dark:border-zinc-800",
    destructive: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
    warning:     "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-400",
    success:     "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400",
  };
  function Alert(props) {
    var variant = props.variant || "default";
    var rest = Object.assign({}, props); delete rest.variant; delete rest.className;
    return h("div", Object.assign({
      role: "alert",
      className: cn("relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11",
        ALERT_VARIANTS[variant] || ALERT_VARIANTS.default, props.className),
    }, rest));
  }
  function AlertTitle(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("h5", Object.assign({ className: cn("mb-1 font-medium leading-none tracking-tight", props.className) }, rest));
  }
  function AlertDescription(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", Object.assign({ className: cn("text-sm [&_p]:leading-relaxed", props.className) }, rest));
  }

  // ─── Progress ─────────────────────────────────────────────────────────────────
  function Progress(props) {
    var value = props.value || 0;
    var rest = Object.assign({}, props); delete rest.value; delete rest.className;
    return h("div", Object.assign({
      role: "progressbar", "aria-valuenow": value, "aria-valuemin": 0, "aria-valuemax": 100,
      className: cn("relative h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800", props.className),
    }, rest),
      h("div", { className: "h-full bg-zinc-900 transition-all dark:bg-zinc-50", style: { width: value + "%" } })
    );
  }

  // ─── Switch ───────────────────────────────────────────────────────────────────
  function Switch(props) {
    var checked = props.checked;
    var defaultChecked = props.defaultChecked || false;
    var state = useState(checked !== undefined ? checked : defaultChecked);
    var isOn = checked !== undefined ? checked : state[0];
    var setOn = state[1];
    function toggle() {
      var next = !isOn;
      if (checked === undefined) setOn(next);
      if (props.onCheckedChange) props.onCheckedChange(next);
    }
    var rest = Object.assign({}, props);
    delete rest.checked; delete rest.defaultChecked; delete rest.onCheckedChange; delete rest.className;
    return h("button", Object.assign({
      role: "switch", "aria-checked": isOn, type: "button",
      onClick: toggle,
      className: cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isOn ? "bg-zinc-900 dark:bg-zinc-50" : "bg-zinc-200 dark:bg-zinc-700",
        props.className
      ),
    }, rest),
      h("span", {
        className: cn("pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform dark:bg-zinc-950",
          isOn ? "translate-x-4" : "translate-x-0"),
      })
    );
  }

  // ─── Checkbox ─────────────────────────────────────────────────────────────────
  function Checkbox(props) {
    var checked = props.checked;
    var defaultChecked = props.defaultChecked || false;
    var state = useState(checked !== undefined ? checked : defaultChecked);
    var isOn = checked !== undefined ? checked : state[0];
    var setOn = state[1];
    function toggle() {
      var next = !isOn;
      if (checked === undefined) setOn(next);
      if (props.onCheckedChange) props.onCheckedChange(next);
    }
    var rest = Object.assign({}, props);
    delete rest.checked; delete rest.defaultChecked; delete rest.onCheckedChange; delete rest.className;
    return h("button", Object.assign({
      role: "checkbox", "aria-checked": isOn, type: "button", onClick: toggle,
      className: cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-zinc-400 shadow focus-visible:outline-none focus-visible:ring-1",
        "focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50",
        isOn ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-900" : "bg-white dark:bg-zinc-950 dark:border-zinc-600",
        props.className
      ),
    }, rest),
      isOn && h("svg", { className: "h-3.5 w-3.5 block mx-auto", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3" },
        h("polyline", { points: "20 6 9 17 4 12" })
      )
    );
  }

  // ─── Table ────────────────────────────────────────────────────────────────────
  function Table(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", { className: "relative w-full overflow-auto" },
      h("table", Object.assign({ className: cn("w-full caption-bottom text-sm", props.className) }, rest))
    );
  }
  function TableHeader(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("thead", Object.assign({ className: cn("[&_tr]:border-b", props.className) }, rest));
  }
  function TableBody(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("tbody", Object.assign({ className: cn("[&_tr:last-child]:border-0", props.className) }, rest));
  }
  function TableFooter(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("tfoot", Object.assign({ className: cn("border-t bg-zinc-100/50 font-medium last:[&>tr]:border-b-0 dark:bg-zinc-800/50", props.className) }, rest));
  }
  function TableRow(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("tr", Object.assign({ className: cn("border-b border-zinc-200 transition-colors hover:bg-zinc-50/50 data-[state=selected]:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 dark:data-[state=selected]:bg-zinc-800", props.className) }, rest));
  }
  function TableHead(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("th", Object.assign({ className: cn("h-10 px-4 text-left align-middle font-medium text-zinc-500 [&:has([role=checkbox])]:pr-0 dark:text-zinc-400", props.className) }, rest));
  }
  function TableCell(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("td", Object.assign({ className: cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", props.className) }, rest));
  }
  function TableCaption(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("caption", Object.assign({ className: cn("mt-4 text-sm text-zinc-500 dark:text-zinc-400", props.className) }, rest));
  }

  // ─── Tabs ─────────────────────────────────────────────────────────────────────
  var TabsCtx = createContext({ value: "", onValueChange: null });
  function Tabs(props) {
    var defaultValue = props.defaultValue || "";
    var controlled = props.value !== undefined;
    var state = useState(controlled ? props.value : defaultValue);
    var current = controlled ? props.value : state[0];
    var setCurrent = state[1];
    function onValueChange(v) {
      if (!controlled) setCurrent(v);
      if (props.onValueChange) props.onValueChange(v);
    }
    var rest = Object.assign({}, props);
    delete rest.value; delete rest.defaultValue; delete rest.onValueChange; delete rest.className;
    return h(TabsCtx.Provider, { value: { value: current, onValueChange: onValueChange } },
      h("div", Object.assign({ className: cn("w-full", props.className) }, rest))
    );
  }
  function TabsList(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", Object.assign({
      role: "tablist",
      className: cn("inline-flex h-9 items-center justify-center rounded-lg bg-zinc-100 p-1 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400", props.className),
    }, rest));
  }
  function TabsTrigger(props) {
    var ctx = useContext(TabsCtx);
    var isActive = ctx.value === props.value;
    var rest = Object.assign({}, props); delete rest.value; delete rest.className;
    return h("button", Object.assign({
      role: "tab", type: "button", "aria-selected": isActive,
      onClick: function() { ctx.onValueChange(props.value); },
      className: cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-white transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950",
        "disabled:pointer-events-none disabled:opacity-50",
        isActive ? "bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-zinc-50" : "hover:text-zinc-900 dark:hover:text-zinc-50",
        props.className
      ),
    }, rest));
  }
  function TabsContent(props) {
    var ctx = useContext(TabsCtx);
    if (ctx.value !== props.value) return null;
    var rest = Object.assign({}, props); delete rest.value; delete rest.className;
    return h("div", Object.assign({
      role: "tabpanel",
      className: cn("mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950", props.className),
    }, rest));
  }

  // ─── Accordion ────────────────────────────────────────────────────────────────
  var AccordionCtx = createContext({ openItems: {}, toggle: null, type: "single" });
  function Accordion(props) {
    var type = props.type || "single";
    var defaultValue = props.defaultValue;
    var initial = {};
    if (defaultValue) {
      if (Array.isArray(defaultValue)) defaultValue.forEach(function(v) { initial[v] = true; });
      else initial[defaultValue] = true;
    }
    var state = useState(initial);
    var openItems = state[0];
    var setOpenItems = state[1];
    function toggle(v) {
      setOpenItems(function(prev) {
        var next = Object.assign({}, prev);
        if (type === "single") {
          var wasOpen = !!next[v];
          Object.keys(next).forEach(function(k) { delete next[k]; });
          if (!wasOpen) next[v] = true;
        } else {
          if (next[v]) delete next[v]; else next[v] = true;
        }
        return next;
      });
    }
    var rest = Object.assign({}, props); delete rest.type; delete rest.defaultValue; delete rest.className;
    return h(AccordionCtx.Provider, { value: { openItems: openItems, toggle: toggle } },
      h("div", Object.assign({ className: cn("w-full", props.className) }, rest))
    );
  }
  function AccordionItem(props) {
    var rest = Object.assign({}, props); delete rest.value; delete rest.className;
    return h("div", Object.assign({ className: cn("border-b border-zinc-200 dark:border-zinc-800", props.className) }, rest));
  }
  function AccordionTrigger(props) {
    var ctx = useContext(AccordionCtx);
    var itemCtx = useContext(AccordionItemCtx);
    var isOpen = !!(ctx.openItems && ctx.openItems[itemCtx.value]);
    var rest = Object.assign({}, props); delete rest.className;
    return h("button", Object.assign({
      type: "button",
      "aria-expanded": isOpen,
      onClick: function() { ctx.toggle(itemCtx.value); },
      className: cn(
        "flex flex-1 w-full items-center justify-between py-4 text-sm font-medium transition-all hover:underline",
        "[&[aria-expanded=true]>svg]:rotate-180",
        props.className
      ),
    }, rest),
      props.children,
      h("svg", { className: "h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
        h("polyline", { points: "6 9 12 15 18 9" })
      )
    );
  }
  var AccordionItemCtx = createContext({ value: "" });
  var _OrigAccordionItem = AccordionItem;
  AccordionItem = function(props) {
    var rest = Object.assign({}, props); delete rest.value;
    return h(AccordionItemCtx.Provider, { value: { value: props.value } },
      _OrigAccordionItem(rest)
    );
  };
  function AccordionContent(props) {
    var ctx = useContext(AccordionCtx);
    var itemCtx = useContext(AccordionItemCtx);
    var isOpen = !!(ctx.openItems && ctx.openItems[itemCtx.value]);
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", {
      style: { overflow: "hidden", transition: "max-height 0.2s ease", maxHeight: isOpen ? "1000px" : "0" },
      "aria-hidden": !isOpen,
    },
      h("div", Object.assign({ className: cn("pb-4 pt-0 text-sm", props.className) }, rest))
    );
  }

  // ─── Collapsible ──────────────────────────────────────────────────────────────
  var CollapsibleCtx = createContext({ open: false, toggle: null });
  function Collapsible(props) {
    var controlled = props.open !== undefined;
    var state = useState(controlled ? props.open : (props.defaultOpen || false));
    var open = controlled ? props.open : state[0];
    var setOpen = state[1];
    function toggle() {
      var next = !open;
      if (!controlled) setOpen(next);
      if (props.onOpenChange) props.onOpenChange(next);
    }
    var rest = Object.assign({}, props); delete rest.open; delete rest.defaultOpen; delete rest.onOpenChange; delete rest.className;
    return h(CollapsibleCtx.Provider, { value: { open: open, toggle: toggle } },
      h("div", Object.assign({ className: props.className }, rest))
    );
  }
  function CollapsibleTrigger(props) {
    var ctx = useContext(CollapsibleCtx);
    var rest = Object.assign({}, props); delete rest.asChild;
    return h("button", Object.assign({ type: "button", onClick: function() { ctx.toggle(); } }, rest));
  }
  function CollapsibleContent(props) {
    var ctx = useContext(CollapsibleCtx);
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", Object.assign({
      style: { overflow: "hidden", maxHeight: ctx.open ? "1000px" : "0", transition: "max-height 0.2s ease" },
      className: props.className,
    }, rest));
  }

  // ─── Select ───────────────────────────────────────────────────────────────────
  var SelectCtx = createContext({ value: "", open: false, onValueChange: null, setOpen: null });
  function Select(props) {
    var controlled = props.value !== undefined;
    var valState = useState(controlled ? props.value : (props.defaultValue || ""));
    var openState = useState(false);
    var value = controlled ? props.value : valState[0];
    var open = openState[0];
    var setOpen = openState[1];
    function onValueChange(v) {
      if (!controlled) valState[1](v);
      if (props.onValueChange) props.onValueChange(v);
      setOpen(false);
    }
    var rest = Object.assign({}, props); delete rest.value; delete rest.defaultValue; delete rest.onValueChange;
    return h(SelectCtx.Provider, { value: { value: value, open: open, onValueChange: onValueChange, setOpen: setOpen } },
      h("div", Object.assign({ style: { position: "relative", display: "inline-block", width: "100%" } }, rest))
    );
  }
  function SelectTrigger(props) {
    var ctx = useContext(SelectCtx);
    var rest = Object.assign({}, props); delete rest.className;
    return h("button", Object.assign({
      type: "button",
      "aria-expanded": ctx.open,
      onClick: function(e) { e.stopPropagation(); ctx.setOpen(!ctx.open); },
      className: cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm shadow-sm",
        "focus:outline-none focus:ring-1 focus:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50",
        "dark:border-zinc-700 dark:text-zinc-50",
        props.className
      ),
    }, rest),
      props.children,
      h("svg", { className: "h-4 w-4 opacity-50 shrink-0", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
        h("polyline", { points: "6 9 12 15 18 9" })
      )
    );
  }
  function SelectValue(props) {
    var ctx = useContext(SelectCtx);
    return h("span", { className: ctx.value ? "" : "text-zinc-400" }, ctx.value || props.placeholder || "Select…");
  }
  function SelectContent(props) {
    var ctx = useContext(SelectCtx);
    var ref = useRef(null);
    useEffect(function() {
      if (!ctx.open) return;
      function handler(e) {
        if (ref.current && !ref.current.contains(e.target)) ctx.setOpen(false);
      }
      document.addEventListener("mousedown", handler);
      return function() { document.removeEventListener("mousedown", handler); };
    }, [ctx.open]);
    if (!ctx.open) return null;
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", Object.assign({
      ref: ref,
      className: cn(
        "absolute z-50 top-full left-0 mt-1 w-full min-w-[8rem] overflow-hidden rounded-md border border-zinc-200 bg-white shadow-md",
        "dark:border-zinc-800 dark:bg-zinc-950",
        "animate-in fade-in-0 zoom-in-95",
        props.className
      ),
    }, rest),
      h("div", { className: "p-1 max-h-56 overflow-auto" }, props.children)
    );
  }
  function SelectItem(props) {
    var ctx = useContext(SelectCtx);
    var isSelected = ctx.value === props.value;
    var rest = Object.assign({}, props); delete rest.value; delete rest.className;
    return h("div", Object.assign({
      role: "option", "aria-selected": isSelected,
      onClick: function() { ctx.onValueChange(props.value); },
      className: cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
        "hover:bg-zinc-100 dark:hover:bg-zinc-800",
        isSelected ? "text-zinc-900 dark:text-zinc-50 font-medium" : "text-zinc-700 dark:text-zinc-300",
        props.className
      ),
    }, rest),
      isSelected && h("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center" },
        h("svg", { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
          h("polyline", { points: "20 6 9 17 4 12" })
        )
      ),
      props.children
    );
  }
  function SelectLabel(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", Object.assign({ className: cn("px-2 py-1.5 text-xs font-semibold text-zinc-500", props.className) }, rest));
  }
  function SelectSeparator(props) {
    return h("div", { className: "mx-1 my-1 h-px bg-zinc-100 dark:bg-zinc-800" });
  }

  // ─── Dialog ───────────────────────────────────────────────────────────────────
  var DialogCtx = createContext({ open: false, setOpen: null });
  function Dialog(props) {
    var controlled = props.open !== undefined;
    var state = useState(controlled ? props.open : false);
    var open = controlled ? props.open : state[0];
    var setOpen = state[1];
    function handleSetOpen(v) {
      if (!controlled) setOpen(v);
      if (props.onOpenChange) props.onOpenChange(v);
    }
    var rest = Object.assign({}, props); delete rest.open; delete rest.onOpenChange;
    return h(DialogCtx.Provider, { value: { open: open, setOpen: handleSetOpen } }, props.children);
  }
  function DialogTrigger(props) {
    var ctx = useContext(DialogCtx);
    var rest = Object.assign({}, props); delete rest.asChild;
    return h("button", Object.assign({ type: "button", onClick: function() { ctx.setOpen(true); } }, rest));
  }
  function DialogContent(props) {
    var ctx = useContext(DialogCtx);
    if (!ctx.open) return null;
    var rest = Object.assign({}, props); delete rest.className;
    var overlay = h("div", {
      className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
      onClick: function() { ctx.setOpen(false); },
    });
    var panel = h("div", Object.assign({
      className: cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
        "gap-4 border border-zinc-200 bg-white p-6 shadow-lg rounded-xl",
        "dark:border-zinc-800 dark:bg-zinc-950",
        props.className
      ),
      onClick: function(e) { e.stopPropagation(); },
    }, rest),
      h("button", {
        type: "button",
        onClick: function() { ctx.setOpen(false); },
        className: "absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none",
      },
        h("svg", { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
          h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
          h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
        )
      ),
      props.children
    );
    return RD && RD.createPortal ? RD.createPortal(h(Fragment, null, overlay, panel), document.body) : h(Fragment, null, overlay, panel);
  }
  function DialogHeader(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", Object.assign({ className: cn("flex flex-col space-y-1.5 text-center sm:text-left", props.className) }, rest));
  }
  function DialogFooter(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", Object.assign({ className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", props.className) }, rest));
  }
  function DialogTitle(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("h2", Object.assign({ className: cn("text-lg font-semibold leading-none tracking-tight", props.className) }, rest));
  }
  function DialogDescription(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("p", Object.assign({ className: cn("text-sm text-zinc-500 dark:text-zinc-400", props.className) }, rest));
  }
  function DialogClose(props) {
    var ctx = useContext(DialogCtx);
    var rest = Object.assign({}, props);
    return h("button", Object.assign({ type: "button", onClick: function() { ctx.setOpen(false); } }, rest));
  }

  // ─── Sheet ────────────────────────────────────────────────────────────────────
  var SheetCtx = createContext({ open: false, setOpen: null });
  function Sheet(props) {
    var controlled = props.open !== undefined;
    var state = useState(controlled ? props.open : false);
    var open = controlled ? props.open : state[0];
    var setOpen = state[1];
    function handleSetOpen(v) {
      if (!controlled) setOpen(v);
      if (props.onOpenChange) props.onOpenChange(v);
    }
    return h(SheetCtx.Provider, { value: { open: open, setOpen: handleSetOpen } }, props.children);
  }
  function SheetTrigger(props) {
    var ctx = useContext(SheetCtx);
    var rest = Object.assign({}, props); delete rest.asChild;
    return h("button", Object.assign({ type: "button", onClick: function() { ctx.setOpen(true); } }, rest));
  }
  var SHEET_SIDES = {
    right:  "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm translate-x-0",
    left:   "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm translate-x-0",
    top:    "inset-x-0 top-0 h-auto border-b",
    bottom: "inset-x-0 bottom-0 h-auto border-t",
  };
  function SheetContent(props) {
    var ctx = useContext(SheetCtx);
    var side = props.side || "right";
    if (!ctx.open) return null;
    var rest = Object.assign({}, props); delete rest.side; delete rest.className;
    var overlay = h("div", {
      className: "fixed inset-0 z-50 bg-black/50",
      onClick: function() { ctx.setOpen(false); },
    });
    var panel = h("div", Object.assign({
      className: cn(
        "fixed z-50 bg-white p-6 shadow-lg dark:bg-zinc-950",
        "border-zinc-200 dark:border-zinc-800",
        SHEET_SIDES[side] || SHEET_SIDES.right,
        props.className
      ),
      onClick: function(e) { e.stopPropagation(); },
    }, rest),
      h("button", {
        type: "button",
        onClick: function() { ctx.setOpen(false); },
        className: "absolute right-4 top-4 opacity-70 hover:opacity-100",
      },
        h("svg", { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
          h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
          h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
        )
      ),
      props.children
    );
    return RD && RD.createPortal ? RD.createPortal(h(Fragment, null, overlay, panel), document.body) : h(Fragment, null, overlay, panel);
  }
  function SheetHeader(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", Object.assign({ className: cn("flex flex-col space-y-2 text-center sm:text-left", props.className) }, rest));
  }
  function SheetFooter(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", Object.assign({ className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", props.className) }, rest));
  }
  function SheetTitle(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("h2", Object.assign({ className: cn("text-lg font-semibold text-zinc-900 dark:text-zinc-50", props.className) }, rest));
  }
  function SheetDescription(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("p", Object.assign({ className: cn("text-sm text-zinc-500 dark:text-zinc-400", props.className) }, rest));
  }
  function SheetClose(props) {
    var ctx = useContext(SheetCtx);
    var rest = Object.assign({}, props);
    return h("button", Object.assign({ type: "button", onClick: function() { ctx.setOpen(false); } }, rest));
  }

  // ─── DropdownMenu ─────────────────────────────────────────────────────────────
  var DDCtx = createContext({ open: false, setOpen: null });
  function DropdownMenu(props) {
    var state = useState(false);
    return h(DDCtx.Provider, { value: { open: state[0], setOpen: state[1] } }, props.children);
  }
  function DropdownMenuTrigger(props) {
    var ctx = useContext(DDCtx);
    var rest = Object.assign({}, props); delete rest.asChild;
    return h("button", Object.assign({ type: "button", onClick: function(e) { e.stopPropagation(); ctx.setOpen(!ctx.open); } }, rest));
  }
  function DropdownMenuContent(props) {
    var ctx = useContext(DDCtx);
    var ref = useRef(null);
    var align = props.align || "start";
    useEffect(function() {
      if (!ctx.open) return;
      function handler(e) {
        if (ref.current && !ref.current.contains(e.target)) ctx.setOpen(false);
      }
      document.addEventListener("mousedown", handler);
      return function() { document.removeEventListener("mousedown", handler); };
    }, [ctx.open]);
    if (!ctx.open) return null;
    var rest = Object.assign({}, props); delete rest.className; delete rest.align; delete rest.sideOffset;
    var alignCls = align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";
    var panel = h("div", Object.assign({
      ref: ref,
      className: cn(
        "absolute z-50 top-full mt-1 min-w-[8rem] overflow-hidden rounded-md border border-zinc-200 bg-white p-1 shadow-md",
        "dark:border-zinc-800 dark:bg-zinc-950",
        alignCls,
        props.className
      ),
    }, rest), props.children);
    var container = h("div", { style: { position: "relative" } }, panel);
    return RD && RD.createPortal ? RD.createPortal(
      h("div", { style: { position: "absolute" } }, panel),
      document.body
    ) : container;
  }
  function DropdownMenuItem(props) {
    var ctx = useContext(DDCtx);
    var rest = Object.assign({}, props); delete rest.className; delete rest.inset;
    var onClick = props.onClick;
    return h("div", Object.assign({
      role: "menuitem",
      onClick: function(e) { if (onClick) onClick(e); ctx.setOpen(false); },
      className: cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        "hover:bg-zinc-100 dark:hover:bg-zinc-800",
        "text-zinc-700 dark:text-zinc-300",
        props.inset && "pl-8",
        props.className
      ),
    }, rest));
  }
  function DropdownMenuLabel(props) {
    var rest = Object.assign({}, props); delete rest.className; delete rest.inset;
    return h("div", Object.assign({ className: cn("px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400", props.inset && "pl-8", props.className) }, rest));
  }
  function DropdownMenuSeparator(props) {
    return h("div", { className: "-mx-1 my-1 h-px bg-zinc-100 dark:bg-zinc-800" });
  }
  function DropdownMenuShortcut(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("span", Object.assign({ className: cn("ml-auto text-xs tracking-widest opacity-60", props.className) }, rest));
  }
  function DropdownMenuCheckboxItem(props) {
    var checked = props.checked || false;
    var rest = Object.assign({}, props); delete rest.checked; delete rest.className; delete rest.onCheckedChange;
    var ctx = useContext(DDCtx);
    return h("div", Object.assign({
      role: "menuitemcheckbox", "aria-checked": checked,
      onClick: function(e) { if (props.onCheckedChange) props.onCheckedChange(!checked); },
      className: cn("relative flex cursor-pointer items-center rounded-sm py-1.5 pl-8 pr-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300", props.className),
    }, rest),
      checked && h("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center" },
        h("svg", { className: "h-3.5 w-3.5", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, h("polyline", { points: "20 6 9 17 4 12" }))
      ),
      props.children
    );
  }

  // ─── Tooltip ──────────────────────────────────────────────────────────────────
  function TooltipProvider(props) { return props.children; }
  var TooltipCtx = createContext({ open: false, setOpen: null });
  function Tooltip(props) {
    var state = useState(false);
    return h(TooltipCtx.Provider, { value: { open: state[0], setOpen: state[1] } }, props.children);
  }
  function TooltipTrigger(props) {
    var ctx = useContext(TooltipCtx);
    var rest = Object.assign({}, props); delete rest.asChild;
    return h("span", Object.assign({
      onMouseEnter: function() { ctx.setOpen(true); },
      onMouseLeave: function() { ctx.setOpen(false); },
      onFocus: function() { ctx.setOpen(true); },
      onBlur: function() { ctx.setOpen(false); },
      style: { position: "relative", display: "inline-flex" },
    }, rest));
  }
  function TooltipContent(props) {
    var ctx = useContext(TooltipCtx);
    if (!ctx.open) return null;
    var side = props.side || "top";
    var posStyle = side === "top" ? { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" }
      : side === "bottom" ? { top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" }
      : side === "left" ? { right: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" }
      : { left: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" };
    var rest = Object.assign({}, props); delete rest.side; delete rest.className; delete rest.sideOffset;
    return h("div", Object.assign({
      role: "tooltip",
      style: Object.assign({ position: "absolute", zIndex: 50, pointerEvents: "none" }, posStyle),
      className: cn(
        "z-50 overflow-hidden rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-zinc-50 shadow-md whitespace-nowrap",
        "dark:bg-zinc-50 dark:text-zinc-900",
        props.className
      ),
    }, rest));
  }

  // ─── Popover ──────────────────────────────────────────────────────────────────
  var PopoverCtx = createContext({ open: false, setOpen: null });
  function Popover(props) {
    var state = useState(false);
    return h(PopoverCtx.Provider, { value: { open: state[0], setOpen: state[1] } }, props.children);
  }
  function PopoverTrigger(props) {
    var ctx = useContext(PopoverCtx);
    var rest = Object.assign({}, props); delete rest.asChild;
    return h("button", Object.assign({ type: "button", onClick: function(e) { e.stopPropagation(); ctx.setOpen(!ctx.open); } }, rest));
  }
  function PopoverContent(props) {
    var ctx = useContext(PopoverCtx);
    var ref = useRef(null);
    var align = props.align || "center";
    useEffect(function() {
      if (!ctx.open) return;
      function handler(e) {
        if (ref.current && !ref.current.contains(e.target)) ctx.setOpen(false);
      }
      document.addEventListener("mousedown", handler);
      return function() { document.removeEventListener("mousedown", handler); };
    }, [ctx.open]);
    if (!ctx.open) return null;
    var alignCls = align === "end" ? "right-0" : align === "start" ? "left-0" : "left-1/2 -translate-x-1/2";
    var rest = Object.assign({}, props); delete rest.className; delete rest.align; delete rest.sideOffset;
    return h("div", Object.assign({
      ref: ref,
      style: { position: "absolute", zIndex: 50, top: "calc(100% + 8px)" },
      className: cn(
        "z-50 w-72 rounded-md border border-zinc-200 bg-white p-4 shadow-md outline-none",
        "dark:border-zinc-800 dark:bg-zinc-950",
        alignCls,
        props.className
      ),
    }, rest), props.children);
  }

  // ─── ScrollArea ───────────────────────────────────────────────────────────────
  function ScrollArea(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("div", Object.assign({
      className: cn("relative overflow-hidden", props.className),
      style: { overflowY: "auto", scrollbarWidth: "thin" },
    }, rest));
  }

  // ─── Breadcrumb ───────────────────────────────────────────────────────────────
  function Breadcrumb(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("nav", Object.assign({ "aria-label": "breadcrumb", className: props.className }, rest));
  }
  function BreadcrumbList(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("ol", Object.assign({ className: cn("flex flex-wrap items-center gap-1.5 break-words text-sm text-zinc-500 sm:gap-2.5 dark:text-zinc-400", props.className) }, rest));
  }
  function BreadcrumbItem(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("li", Object.assign({ className: cn("inline-flex items-center gap-1.5", props.className) }, rest));
  }
  function BreadcrumbLink(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("a", Object.assign({ className: cn("transition-colors hover:text-zinc-950 dark:hover:text-zinc-50", props.className) }, rest));
  }
  function BreadcrumbPage(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("span", Object.assign({ role: "link", "aria-current": "page", className: cn("font-normal text-zinc-950 dark:text-zinc-50", props.className) }, rest));
  }
  function BreadcrumbSeparator(props) {
    return h("span", { role: "presentation", "aria-hidden": true, className: cn("[&>svg]:w-3.5 [&>svg]:h-3.5", props.className) },
      props.children || h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: "h-4 w-4" }, h("polyline", { points: "9 18 15 12 9 6" }))
    );
  }

  // ─── Pagination ───────────────────────────────────────────────────────────────
  function Pagination(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("nav", Object.assign({ role: "navigation", "aria-label": "pagination", className: cn("mx-auto flex w-full justify-center", props.className) }, rest));
  }
  function PaginationContent(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("ul", Object.assign({ className: cn("flex flex-row items-center gap-1", props.className) }, rest));
  }
  function PaginationItem(props) {
    var rest = Object.assign({}, props); delete rest.className;
    return h("li", Object.assign({ className: props.className }, rest));
  }
  function PaginationLink(props) {
    var isActive = props.isActive;
    var rest = Object.assign({}, props); delete rest.isActive; delete rest.className;
    return h("a", Object.assign({
      "aria-current": isActive ? "page" : undefined,
      className: cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9",
        "transition-colors focus-visible:outline-none focus-visible:ring-1",
        isActive ? "border border-zinc-300 bg-white shadow-sm" : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
        props.className
      ),
    }, rest));
  }

  // ─── Spinner ──────────────────────────────────────────────────────────────────
  function Spinner(props) {
    return h("svg", {
      className: cn("animate-spin", props.size === "sm" ? "h-4 w-4" : props.size === "lg" ? "h-8 w-8" : "h-6 w-6", props.className),
      xmlns: "http://www.w3.org/2000/svg",
      fill: "none",
      viewBox: "0 0 24 24",
    },
      h("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
      h("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })
    );
  }

  // ─── HoverCard ────────────────────────────────────────────────────────────────
  function HoverCard(props) {
    var state = useState(false);
    return h(TooltipCtx.Provider, { value: { open: state[0], setOpen: state[1] } }, props.children);
  }
  function HoverCardTrigger(props) {
    var ctx = useContext(TooltipCtx);
    var rest = Object.assign({}, props); delete rest.asChild;
    return h("span", Object.assign({
      onMouseEnter: function() { ctx.setOpen(true); },
      onMouseLeave: function() { ctx.setOpen(false); },
      style: { position: "relative", display: "inline-flex" },
    }, rest));
  }
  function HoverCardContent(props) {
    var ctx = useContext(TooltipCtx);
    if (!ctx.open) return null;
    var rest = Object.assign({}, props); delete rest.className; delete rest.align; delete rest.sideOffset;
    return h("div", Object.assign({
      style: { position: "absolute", zIndex: 50, top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
      className: cn("z-50 w-64 rounded-md border border-zinc-200 bg-white p-4 shadow-md dark:border-zinc-800 dark:bg-zinc-950", props.className),
    }, rest), props.children);
  }

  // ─── AspectRatio ──────────────────────────────────────────────────────────────
  function AspectRatio(props) {
    var ratio = props.ratio || 16/9;
    var rest = Object.assign({}, props); delete rest.ratio; delete rest.className;
    return h("div", { style: { position: "relative", width: "100%", paddingBottom: (100/ratio) + "%" }, className: props.className },
      h("div", Object.assign({ style: { position: "absolute", inset: 0 } }, rest))
    );
  }

  // ─── exports ──────────────────────────────────────────────────────────────────
  global.ShadcnUI = {
    cn: cn,
    // Form
    Button: Button,
    Input: Input,
    Textarea: Textarea,
    Label: Label,
    Switch: Switch,
    Checkbox: Checkbox,
    Select: Select,
    SelectTrigger: SelectTrigger,
    SelectValue: SelectValue,
    SelectContent: SelectContent,
    SelectItem: SelectItem,
    SelectLabel: SelectLabel,
    SelectSeparator: SelectSeparator,
    // Display
    Badge: Badge,
    Card: Card,
    CardHeader: CardHeader,
    CardTitle: CardTitle,
    CardDescription: CardDescription,
    CardContent: CardContent,
    CardFooter: CardFooter,
    Avatar: Avatar,
    AvatarImage: AvatarImage,
    AvatarFallback: AvatarFallback,
    Separator: Separator,
    Skeleton: Skeleton,
    Progress: Progress,
    Alert: Alert,
    AlertTitle: AlertTitle,
    AlertDescription: AlertDescription,
    AspectRatio: AspectRatio,
    Spinner: Spinner,
    // Table
    Table: Table,
    TableHeader: TableHeader,
    TableBody: TableBody,
    TableFooter: TableFooter,
    TableRow: TableRow,
    TableHead: TableHead,
    TableCell: TableCell,
    TableCaption: TableCaption,
    // Navigation
    Tabs: Tabs,
    TabsList: TabsList,
    TabsTrigger: TabsTrigger,
    TabsContent: TabsContent,
    Breadcrumb: Breadcrumb,
    BreadcrumbList: BreadcrumbList,
    BreadcrumbItem: BreadcrumbItem,
    BreadcrumbLink: BreadcrumbLink,
    BreadcrumbPage: BreadcrumbPage,
    BreadcrumbSeparator: BreadcrumbSeparator,
    Pagination: Pagination,
    PaginationContent: PaginationContent,
    PaginationItem: PaginationItem,
    PaginationLink: PaginationLink,
    // Layout / collapsible
    Accordion: Accordion,
    AccordionItem: AccordionItem,
    AccordionTrigger: AccordionTrigger,
    AccordionContent: AccordionContent,
    Collapsible: Collapsible,
    CollapsibleTrigger: CollapsibleTrigger,
    CollapsibleContent: CollapsibleContent,
    ScrollArea: ScrollArea,
    // Overlays
    Dialog: Dialog,
    DialogTrigger: DialogTrigger,
    DialogContent: DialogContent,
    DialogHeader: DialogHeader,
    DialogFooter: DialogFooter,
    DialogTitle: DialogTitle,
    DialogDescription: DialogDescription,
    DialogClose: DialogClose,
    Sheet: Sheet,
    SheetTrigger: SheetTrigger,
    SheetContent: SheetContent,
    SheetHeader: SheetHeader,
    SheetFooter: SheetFooter,
    SheetTitle: SheetTitle,
    SheetDescription: SheetDescription,
    SheetClose: SheetClose,
    DropdownMenu: DropdownMenu,
    DropdownMenuTrigger: DropdownMenuTrigger,
    DropdownMenuContent: DropdownMenuContent,
    DropdownMenuItem: DropdownMenuItem,
    DropdownMenuLabel: DropdownMenuLabel,
    DropdownMenuSeparator: DropdownMenuSeparator,
    DropdownMenuShortcut: DropdownMenuShortcut,
    DropdownMenuCheckboxItem: DropdownMenuCheckboxItem,
    Tooltip: Tooltip,
    TooltipProvider: TooltipProvider,
    TooltipTrigger: TooltipTrigger,
    TooltipContent: TooltipContent,
    Popover: Popover,
    PopoverTrigger: PopoverTrigger,
    PopoverContent: PopoverContent,
    HoverCard: HoverCard,
    HoverCardTrigger: HoverCardTrigger,
    HoverCardContent: HoverCardContent,
  };
})(window);

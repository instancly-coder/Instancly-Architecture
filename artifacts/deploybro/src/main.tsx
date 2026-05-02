import { createRoot } from "react-dom/client";
import App from "./App";
import { installDevBypassFetch } from "./lib/dev-bypass";
import "./index.css";

// Install the dev-bypass fetch wrapper BEFORE React mounts so the
// very first /api request from any component carries the
// `X-Dev-Bypass` header when the bypass flag is set. No-op (and
// fully tree-shaken) in production builds — see lib/dev-bypass.ts.
installDevBypassFetch();

createRoot(document.getElementById("root")!).render(<App />);

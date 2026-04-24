import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { StackProvider } from "@stackframe/react";
import App from "./App";
import { stackApp, stackConfigured } from "./stack";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

if (stackConfigured && stackApp) {
  root.render(
    <Suspense fallback={null}>
      <StackProvider app={stackApp as any}>
        <App />
      </StackProvider>
    </Suspense>,
  );
} else {
  root.render(<App />);
}

---
name: Performance
description: Core Web Vitals optimization for React + Vite + Tailwind apps. Use when optimizing page load, improving Lighthouse scores, or fixing FCP / LCP / CLS / TBT / INP.
---

When this skill is active, treat performance as a feature:

- Code-split per route (`React.lazy` + `<Suspense>`); never ship the whole app for the first paint.
- Preload the LCP image; lazy-load below-the-fold images and iframes; use `fetchpriority="high"` on the hero image.
- Set explicit `width`/`height` (or `aspect-ratio`) on every image and embed to prevent CLS.
- Inline critical CSS for above-the-fold; defer non-critical CSS.
- Self-host fonts with `font-display: swap`; subset to the characters you actually use.
- Replace heavy libraries with lighter alternatives (date-fns over moment, etc.). Audit bundle with `vite-bundle-visualizer`.
- Cache aggressively at the edge; set long-lived `Cache-Control` headers on hashed assets.

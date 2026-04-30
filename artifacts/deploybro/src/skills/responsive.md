---
name: Responsive
description: Make websites, apps, and dashboards work beautifully across screen sizes. Use when the user mentions responsive, mobile, tablet, breakpoints, adaptive layout, or touch targets.
---

When this skill is active, design mobile-first and verify every breakpoint:

- Start at 320px wide. Build the mobile layout first, then progressively enhance for `sm` / `md` / `lg` / `xl` / `2xl`.
- Touch targets ≥ 44×44px on touch devices; increase tap spacing (8px+) to prevent fat-finger errors.
- Replace hover-only affordances with always-visible alternatives on touch (no hover-to-reveal critical actions).
- Use fluid type with `clamp()` for headlines so they scale without media queries.
- Stack horizontal navs / button groups vertically on narrow screens; collapse desktop tables into card lists.
- Test landscape on phones (low height); use `dvh` / `svh` units instead of `vh` to handle mobile browser chrome.
- Verify on a real device or a 1× DPR emulator — not just resized desktop windows.

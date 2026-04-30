---
name: Shadows
description: Shadow and elevation system for creating depth hierarchy. Covers sharp, soft, glow, layered, and neumorphic shadow styles. Use when adding shadows, depth, or elevation to UI.
---

When this skill is active, treat shadow as a structured elevation system, not a one-off effect:

- Define 4–6 elevation levels (`sm`, `md`, `lg`, `xl`, `2xl`) and reuse them — never write ad-hoc `box-shadow`.
- Light always comes from the top: shadows fall down and to one side, not radial.
- Layer two shadows for realism — a tight, dark contact shadow + a softer, lighter ambient.
- Tint shadows with a hint of the element's own color for warmth (e.g. blue button → blue-tinted shadow).
- In dark mode, shadows alone don't read — pair them with a 1px highlight on the top edge or a subtle inner glow.
- Never animate `box-shadow` directly — animate a sibling pseudo-element's `opacity` for performant elevation changes.

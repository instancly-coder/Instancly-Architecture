---
name: Plan Mode
description: Generates a structured build plan first — sections, colors, fonts, pages, features — that you review and edit before any code is written. The approved plan locks the build to your spec.
---

When Plan Mode is on and you submit a prompt, the AI does NOT start writing code immediately. Instead it spends a few cents on a fast planning pass and shows you a structured plan first.

The plan covers:

- A short project summary so you can verify it understood the brief.
- The pages it intends to build.
- The sections of each page (Hero, Features, Pricing, FAQ, Footer, etc.) — each with a description and an on/off toggle.
- A color palette with named swatches.
- The heading and body fonts.
- The headline features and copy tone.

You can:

- Toggle sections on or off.
- Edit any text in the plan — section descriptions, summary, features, copy tone.
- Edit colors and fonts.
- Click **Build This** to lock the build to the approved plan.
- Click **Cancel** to back out and revise your prompt.

The planning AI is read-only — it cannot create or modify files. It only proposes a structure for your review. When you approve, the plan is passed to the builder as a locked spec, and the builder produces code that conforms to it.

Use Plan Mode for:

- Bigger first builds where you want to know exactly what's coming before tokens get spent.
- Brand-sensitive work where you want to lock colors and fonts up front.
- Multi-page sites where the section list is non-obvious.

Skip Plan Mode for:

- Quick iterations and small tweaks to an existing project.
- Anything where you already know what you want and just want it done.

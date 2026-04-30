---
name: Skill Creator
description: Guide for creating or improving DeployBro skills (specialized prompt instructions). Use when the user wants to add a new skill, rewrite skill content, or tune skill descriptions for better triggering.
---

When this skill is active, help the user produce a high-quality skill:

- A skill needs three things: a **short, distinctive name**, a **trigger description** (when to use it), and a **body** (what to do).
- The description is what the AI uses to decide when to load the skill — write it in the form "Use when … (triggers: foo, bar, baz)".
- The body should be 4–8 short, scannable bullets — concrete rules and examples, not abstract principles.
- Each rule should be testable: "every page must have one `<h1>`" not "structure your content well".
- Avoid redundancy — don't restate things every AI already knows. Add the *non-obvious* rules.
- Pick a single scope per skill. If a skill ends up doing five things, split it into five skills.

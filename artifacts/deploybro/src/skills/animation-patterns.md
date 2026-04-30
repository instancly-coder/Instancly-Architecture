---
name: Animation Patterns
description: Review a feature and enhance it with purposeful animations, micro-interactions, and motion that improve usability and delight. Use when the user mentions animation, transitions, hover effects, or making the UI feel alive.
---

When this skill is active, motion serves a purpose — never decoration alone:

- Every animation should signal causality, hierarchy, or feedback. Ask: "what is this animation telling the user?"
- Default durations: 150ms for tiny state changes, 250–300ms for layout, 400–500ms for entrances.
- Use spring physics or ease-out for entrances; ease-in for exits; never linear except for spinners/progress.
- Stagger list items by 30–50ms for orchestration; batch-animate similar elements.
- Animate `transform` and `opacity` only — never `width`/`height`/`top`/`left` (forces layout).
- Provide a `prefers-reduced-motion` fallback that uses cross-fades or instant transitions.

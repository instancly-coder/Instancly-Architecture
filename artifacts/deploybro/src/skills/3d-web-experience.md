---
name: 3D Web Experience
description: Build interactive 3D scenes for the web using Three.js / React Three Fiber. Use when the user explicitly asks for 3D — product viewers, hero backgrounds, particle scenes, or scroll-driven 3D camera work.
---

When this skill is active, build performant, tasteful 3D:

- Prefer `@react-three/fiber` + `@react-three/drei`. Wrap canvases in `<Suspense>` with a fallback.
- Use `useFrame` for animation loops; never `setInterval`. Dispose geometries / materials / textures on unmount.
- Keep draw calls low: instance repeated meshes, share materials, bake static lighting where possible.
- Add `OrbitControls` with sensible damping for product viewers; disable zoom on hero/decorative scenes.
- Respect `prefers-reduced-motion` — fall back to a static poster or a much-slower camera.
- Cap `dpr` (1–2) and target 60fps on a mid-range laptop. Profile with the Three.js Inspector.

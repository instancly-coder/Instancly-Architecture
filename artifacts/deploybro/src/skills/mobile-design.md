---
name: Mobile Design
description: Mobile-first design system for building iOS and Android apps with React Native, Flutter, or native frameworks. Use whenever building any mobile app, screen, or UI.
---

When this skill is active, design for thumbs and platform conventions:

- Primary actions live within the bottom 1/3 of the screen (thumb zone). Top-bar actions are secondary.
- Honor platform navigation: iOS uses tab bars + back-swipe; Android uses bottom sheets + system back.
- Use platform-native components where they exist (date pickers, action sheets) — don't reinvent.
- Tap targets ≥ 44pt (iOS) / 48dp (Android). Increase spacing between adjacent tappables.
- Animate with native springs (UIKit defaults / Material motion). Avoid web-style ease-in-out everywhere.
- Use safe-area insets — content must clear the notch, status bar, and home indicator on every screen.
- Avoid the "AI mobile look": no glassmorphism panels, no metric-card grids, no gradient-everywhere hero screens.

---
name: Plan Mode
description: Runs a short conversational interview before any code is written — the AI asks one focused question at a time (purpose, tone, colors, fonts, pages) and you reply by typing or by tapping a quick-pick chip. After ~4-5 turns it shows a final plan; you click Build this to lock the build to that spec.
---

When Plan Mode is on and you submit a prompt, the AI does NOT start writing code immediately. Instead it opens a quick interview right inside the chat to make sure it understands what you want.

How it works:

1. You send your initial prompt.
2. The AI replies with one short question, plus a few quick-pick chips you can tap to answer in a single click — colors, fonts, tone, pages, etc.
3. You either tap a chip or type your own reply. The AI asks the next question.
4. After roughly four or five turns the AI has enough — it shows a structured plan summary (project name, pages, sections, color palette, fonts, key features, copy tone) and a **Build this** button.
5. Click **Build this** to lock the build to the plan, or **Cancel** to back out and revise your prompt.

Tips:

- Every question includes a "You decide" / "Up to you" chip so you can defer to the AI's taste on anything you don't care about.
- Vague replies are fine — "whatever", "you pick" — the AI will move on.
- The interview never runs more than five questions; if you've already covered most details in your initial prompt the AI will skip to the plan early.
- You can cancel at any point and your original prompt is restored to the input.

Use Plan Mode for:

- Bigger first builds where you want to feel out the direction before tokens get spent.
- Brand-sensitive work where you want to lock colors and fonts up front.
- When you're not sure exactly what you want and it helps to be asked.

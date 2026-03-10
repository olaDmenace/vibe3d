# Vibe3D — LAUNCH WEEK MASTER PLAN

## Overview

7 days, 7 prompts, run sequentially. Each day builds on the previous.
Run each with: `claude --dangerously-skip-permissions`

## Day-by-Day Schedule

| Day | Focus | Prompt File | Impact |
|-----|-------|-------------|--------|
| 1 | Rendering upgrade | CLAUDE-CODE-RENDERING-UPGRADE.md | HDRI lighting, shadows, tone mapping — 3x visual quality |
| 2 | UI polish | CLAUDE-CODE-UI-POLISH.md | Design tokens, fonts, consistent styling |
| 3 | Image-to-3D + style selector | CLAUDE-CODE-DAY3-IMAGE-STYLES.md | Photo upload → 3D model, generation style picker |
| 4 | AI Scene Builder | CLAUDE-CODE-DAY4-SCENE-BUILDER.md | "A desk setup" → multiple auto-placed objects |
| 5 | Material presets + drag-and-drop | CLAUDE-CODE-DAY5-MATERIALS.md | One-click chrome/wood/glass/fabric |
| 6 | Polish + edge cases | CLAUDE-CODE-DAY6-FINAL-POLISH.md | Tooltips, onboarding hints, keyboard shortcut panel |
| 7 | QA + demo | (manual testing day) | Bug fixes, record demo video |

## Already Delivered (from outputs/)

- CLAUDE-CODE-RENDERING-UPGRADE.md (Day 1)
- CLAUDE-CODE-UI-POLISH.md (Day 2)

## Verification After Each Day

After running each prompt, always test:
1. `npx tsc --noEmit` — no type errors
2. `npm run build` — production build passes
3. Open the editor in browser — nothing visually broken
4. Generate a model — generation still works end-to-end

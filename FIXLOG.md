# Fix Log — Autonomous Fix Pass

**Date:** 2026-03-03

## Fixes Applied

| # | Fix | Status | Notes |
|---|-----|--------|-------|
| 1 | Generation polling: exponential backoff + max retries | Already done | setTimeout chain with 3s→15s backoff, 60 poll max, generationHandledRef gate |
| 2 | Clean up generation error messages | Already done | Categorized errors (busy/timeout/generic), no double periods |
| 3 | Clean up object naming from prompts | Already done | `cleanPromptForName()` strips verbs/articles, capitalizes, truncates to 40 |
| 4 | Auto-offset new primitives | Already done | X offset = objectCount * 1.5 |
| 5 | Server-side retry for Meshy API calls | Already done | `withRetry` in both generate route (2 retries) and poll route (1 retry) |
| 6 | Generation loading overlay + store | Already done | generation-store.ts, generation-overlay.tsx, integrated into editor-layout and chat-panel |
| 7 | Reduce undo history size | Applied | Changed maxHistorySize from 50 to 30 |
| 8 | Material disposal in GLB renderer | Applied | Added previousCloneRef, dispose on clone change + unmount |
| 9 | Memoize bounding box in SelectionOverlay | Already done | useMemo with [scene] dependency |
| 10 | Transform sync — destructure array deps | Already done | 9 individual number vars (px,py,pz,rx,ry,rz,sx,sy,sz) as useEffect deps |

## Fixes Needing Manual Review

None.

## Final Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS (pre-existing warnings/errors only — none introduced) |
| `npm run build` | PASS |

---

# Fix Log — Model Quality & Segmentation

**Date:** 2026-03-03

## Fixes Applied

| # | Fix | Status | Notes |
|---|-----|--------|-------|
| 1 | Meshy preview+refine two-step pipeline | Applied | MeshyProvider.refineModel(), generation-service.refineModel(), polling route returns "refining" status, client switches to polling refine task with progress mapped 0-50% preview / 50-100% refine |
| 2 | Better prompt expansion | Applied | Category-specific structural hints (building, car, character, weapon, furniture, tree), always adds "realistic style", "highly detailed", "with PBR textures" |
| 3 | Segmentation cap at 12 parts | Applied | MAX_PARTS=12, capPrimitiveParts/capColorParts helpers, min threshold raised to 5% of total vertices, color bucket size 32→64 |
| 4 | Truncate mesh names in chat message | Applied | Shows first 6 names + "and N more" for models with >6 parts |
| 5 | Default art_style "realistic" | Applied | Always included in Meshy request body, no longer conditionally set |

## Fixes Needing Manual Review

None.

## Final Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS (pre-existing warnings/errors only — none introduced) |
| `npm run build` | PASS |

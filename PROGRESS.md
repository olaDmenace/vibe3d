# Progress Tracker

## Current Phase
Phase 1 — Deterministic Editor Core

## Completed
- [x] Project scaffolding (Next.js 16 + TS + Tailwind v4) — 2026-02-24
- [x] Directory restructure to `src/` layout per PRD — 2026-02-24
- [x] Installed core deps: @react-three/fiber, @react-three/drei, three, zustand, immer, lucide-react — 2026-02-24
- [x] CLAUDE.md and PROGRESS.md created — 2026-02-24
- [x] Type definitions: SceneState, SceneObject, Transform, EditorAction, etc. (`src/types/scene.ts`, `src/types/actions.ts`) — 2026-02-24
- [x] Zustand editor store with Immer, action dispatch, undo/redo (`src/store/editor-store.ts`) — 2026-02-24
- [x] Editor layout: 3-panel (chat, viewport, sidebar) + top toolbar (`src/components/editor/editor-layout.tsx`) — 2026-02-24
- [x] 3D Viewport: R3F Canvas, OrbitControls, grid, directional + ambient lighting — 2026-02-24
- [x] Scene renderer: primitives (cube, sphere, plane, cylinder, cone, torus) from store — 2026-02-24
- [x] Object selection via raycasting (click to select, click empty to deselect) — 2026-02-24
- [x] Selection highlight (wireframe overlay on selected object) — 2026-02-24
- [x] TransformControls gizmo (translate, rotate, scale modes) — 2026-02-24
- [x] Scene hierarchy panel (list objects, click to select, visibility/lock toggles) — 2026-02-24
- [x] Properties panel (name, transform XYZ, material color/roughness/metalness/opacity) — 2026-02-24
- [x] Toolbar: tool modes, add primitives, undo/redo, duplicate, delete — 2026-02-24
- [x] Keyboard shortcuts: Ctrl+Z, Ctrl+Shift+Z, Delete, Ctrl+D, V/G/R/S tool keys — 2026-02-24
- [x] AI chat panel placeholder (Phase 4 stub) — 2026-02-24
- [x] Assets tab placeholder (Phase 3 stub) — 2026-02-24
- [x] Landing page (`/`) from Figma design — nav, hero, video preview, features grid, footer — 2026-02-24
- [x] Sign-in page (`/sign-in`) from Figma design — Google OAuth, email form, hero image panel — 2026-02-24
- [x] Route structure: `/` (landing), `/sign-in` (auth), `/editor` (3D editor) — 2026-02-24
- [x] Downloaded Figma assets: logo icons, feature icons, arrow, play button, Google logo, hero 3D model image — 2026-02-24
- [x] Custom fonts installed: PP Mondwest (display) and Aeonik Pro (body) via @font-face in globals.css — 2026-02-24
- [x] Logo gem SVG added (`public/assets/icons/logo-gem.svg`) — complex masked SVG with filters and blend modes — 2026-02-24
- [x] Trust logos: 9 brand PNGs added (`public/assets/logos/`) — Scale, Google, Shopify, Accenture, Giphy, Webflow, OpenAI, Microsoft, Alloy — 2026-02-24
- [x] Sign-in page updated: real gem logo, PP Mondwest heading, Aeonik Pro body, actual trust logos — 2026-02-24

## In Progress
- (none)

## Blocked / Deferred
- shadcn/ui not yet installed — using plain Tailwind for now; will add shadcn/ui primitives when needed for dialogs, menus, dropdowns.

## Decisions & Notes
- Used Lucide React icons for editor toolbar since Figma MCP was initially rate-limited. Icons are centralized for easy swap.
- Used dark theme color palette as CSS custom properties in `globals.css` (editor-bg, editor-surface, editor-border, editor-accent, etc.).
- Figma design tokens extracted from updated Figma file (xVlyJE0J3QYgpXabNmJXfR): #09090b bg, #18181b surfaces, #6366f1 accent, #fafafa text, Inter font.
- Sign-in page uses warm earth tones from Figma: #101010 bg, #141413 card, #c2c0b6 title, #faf9f5 button, rgba(222,220,209,0.15) borders.
- Moved project from `app/` to `src/app/` to match PRD file structure; tsconfig path alias updated to `./src/*`.
- Fixed structuredClone incompatibility with Immer draft proxies — snapshot is taken via `get()` before entering immer `set()` callback.

## Known Issues
- THREE.js warnings in console: "THREE.Clock: This module has been deprecated" and "PCFSoftShadowMap has been removed" — cosmetic, from drei/three version mismatch.

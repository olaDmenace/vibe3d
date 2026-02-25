# Progress Tracker

## Current Phase
Phase 2 — Persistence & Auth

## Completed

### Phase 1 — Deterministic Editor Core
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

### Phase 2 — Persistence & Auth
- [x] Supabase project created (vibe3d, us-east-1) — 2026-02-25
- [x] Installed @supabase/supabase-js + @supabase/ssr — 2026-02-25
- [x] Database schema: 6 tables (profiles, projects, project_shares, assets, scenes, ai_conversations) — 2026-02-25
- [x] RLS policies for all tables — 2026-02-25
- [x] Auto-create profile trigger on auth.users insert — 2026-02-25
- [x] Auto-update updated_at triggers on profiles, projects, scenes, ai_conversations — 2026-02-25
- [x] Storage buckets: `assets` (private), `thumbnails` (public) with policies — 2026-02-25
- [x] Generated TypeScript database types (`src/types/database.ts`) — 2026-02-25
- [x] Supabase client utilities: browser client, server client, middleware — 2026-02-25
- [x] Next.js middleware for session refresh + route protection — 2026-02-25
- [x] Auth: sign-in page with real Google OAuth + email magic link (OTP) — 2026-02-25
- [x] OAuth callback route (`/auth/callback`) — 2026-02-25
- [x] Dashboard page (`/dashboard`) — list projects, create, delete — 2026-02-25
- [x] API routes: GET/POST /api/projects, GET/PUT/DELETE /api/projects/[id] — 2026-02-25
- [x] API route: PUT /api/projects/[id]/scene — save scene state — 2026-02-25
- [x] Project editor page (`/editor/[id]`) — loads project from DB, hydrates store — 2026-02-25
- [x] Auto-save: debounced 30s interval + save on tab blur + save on beforeunload (sendBeacon) — 2026-02-25
- [x] Manual save: Ctrl+S keyboard shortcut + Save button in toolbar — 2026-02-25
- [x] Project thumbnail capture hook (`use-thumbnail.ts`) — canvas → blob → Supabase Storage — 2026-02-25
- [x] Toolbar shows project name + back-to-dashboard arrow for project editor — 2026-02-25

### Onboarding Flow
- [x] Onboarding page (`/onboarding`) — "What's your primary use case?" multi-select, Figma design match — 2026-02-25
- [x] Downloaded 7 onboarding use case icons from Figma (`public/assets/icons/onboarding-*.svg`) — 2026-02-25
- [x] Onboarding state stored in Supabase user_metadata (onboarding_completed, use_cases) — 2026-02-25
- [x] Auth callback updated — redirects new users to /onboarding, returning users to /dashboard — 2026-02-25
- [x] Editor guided tour component — 3-step tooltip walkthrough (3D Model, AI Assistant, Models List) — 2026-02-25
- [x] Tour state persisted in localStorage (vibe3d_tour_completed) — 2026-02-25
- [x] Middleware updated — standalone /editor allowed without auth — 2026-02-25

### Onboarding Flow
- [x] Downloaded 7 use case icons from Figma (`public/assets/icons/onboarding-*.svg`) — 2026-02-25
- [x] Onboarding page (`/onboarding`) — use case multi-select, gem logo, trust logos, editor preview panel — 2026-02-25
- [x] Editor guided tour (`src/components/editor/tour/editor-tour.tsx`) — 3-step tooltip walkthrough (3D Model → AI Assistant → Models List) — 2026-02-25
- [x] Auth callback updated — redirects new users to `/onboarding`, returning users to `/dashboard` — 2026-02-25
- [x] Onboarding state stored in Supabase `user_metadata` (use_cases + onboarding_completed) — 2026-02-25
- [x] Editor layout updated to include tour overlay — 2026-02-25
- [x] Middleware updated — standalone `/editor` route now allowed for unauthenticated users — 2026-02-25
- [x] Tour completion persisted in localStorage (`vibe3d_tour_completed`) — 2026-02-25

## In Progress
- (none)

## Blocked / Deferred
- shadcn/ui not yet installed — using plain Tailwind for now; will add shadcn/ui primitives when needed for dialogs, menus, dropdowns.
- Google OAuth provider not yet configured in Supabase Dashboard — needs Google Cloud Console client ID/secret.
- Onboarding right panel uses sign-in hero image as placeholder — Figma editor preview mockup asset was too small (24×24). May need manual screenshot or higher-res export.

## Decisions & Notes
- Used Lucide React icons for editor toolbar since Figma MCP was initially rate-limited. Icons are centralized for easy swap.
- Used dark theme color palette as CSS custom properties in `globals.css` (editor-bg, editor-surface, editor-border, editor-accent, etc.).
- Figma design tokens extracted from updated Figma file (xVlyJE0J3QYgpXabNmJXfR): #09090b bg, #18181b surfaces, #6366f1 accent, #fafafa text, Inter font.
- Sign-in page uses warm earth tones from Figma: #101010 bg, #141413 card, #c2c0b6 title, #faf9f5 button, rgba(222,220,209,0.15) borders.
- Moved project from `app/` to `src/app/` to match PRD file structure; tsconfig path alias updated to `./src/*`.
- Fixed structuredClone incompatibility with Immer draft proxies — snapshot is taken via `get()` before entering immer `set()` callback.
- Supabase project ID: `ayhbxyyyzwutsjstradu`, region: `us-east-1`, org: `Kreos`.
- Kept standalone `/editor` route (no auth required) for quick anonymous use alongside the authenticated `/editor/[id]` route.
- Email auth uses magic link (OTP) rather than password — simpler UX, no password storage.
- Auto-save uses `navigator.sendBeacon` on `beforeunload` for reliable save-on-close.
- Thumbnail capture requires `preserveDrawingBuffer: true` on the R3F Canvas.
- Onboarding flow: sign-in → `/onboarding` (use case selection) → `/dashboard` → editor with guided tour.
- Onboarding completion stored in Supabase `user_metadata` via `supabase.auth.updateUser()` — no extra DB migration needed.
- Editor tour state stored in localStorage — survives page reloads but not cross-device. Acceptable for a tour.
- Onboarding page reuses sign-in page layout (2-panel: left form + right hero image) with warm earth tone design tokens.
- Figma onboarding screens analyzed: nodes 1:4502 (default), 1:3550 (default duplicate), 1:3984 (selected state), 1:253 (tour step 1), 1:772 (tour step 2), 1:1291 (tour step 3), 1:1811 (tour step 3 duplicate).

## Known Issues
- THREE.js warnings in console: "THREE.Clock: This module has been deprecated" and "PCFSoftShadowMap has been removed" — cosmetic, from drei/three version mismatch.
- Google OAuth will fail until the provider is configured in the Supabase Dashboard with a Google Cloud Console OAuth client ID/secret.

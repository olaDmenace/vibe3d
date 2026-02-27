# Progress Tracker

## Current Phase
Phase 3 — AI Chat & Generation + Billing Plans

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
- [x] Storage buckets: `assets` (private), `thumbnails` (public), `avatars` (public) with policies — 2026-02-25
- [x] Generated TypeScript database types (`src/types/database.ts`) — 2026-02-25
- [x] Supabase client utilities: browser client, server client, middleware — 2026-02-25
- [x] Next.js middleware for session refresh + route protection — 2026-02-25
- [x] Auth: sign-in page with real Google OAuth + email magic link (OTP) — 2026-02-25
- [x] OAuth callback route (`/auth/callback`) — 2026-02-25
- [x] Dashboard page (`/dashboard`) — list projects, create, delete, avatar display — 2026-02-25
- [x] API routes: GET/POST /api/projects, GET/PUT/DELETE /api/projects/[id] — 2026-02-25
- [x] API route: PUT /api/projects/[id]/scene — save scene state — 2026-02-25
- [x] API route: GET/PUT/DELETE /api/user — profile + preferences + account deletion — 2026-02-25
- [x] Project editor page (`/editor/[id]`) — loads project from DB, hydrates store — 2026-02-25
- [x] Auto-save: debounced 30s interval + save on tab blur + save on beforeunload (sendBeacon) — 2026-02-25
- [x] Manual save: Ctrl+S keyboard shortcut + Save button in toolbar — 2026-02-25
- [x] Project thumbnail capture hook (`use-thumbnail.ts`) — canvas → blob → Supabase Storage — 2026-02-25
- [x] Toolbar shows project name + back-to-dashboard arrow for project editor — 2026-02-25
- [x] Settings modal: Account (name edit, avatar upload), Preferences (theme, language, notifications), Billing, Danger Zone (account deletion) — 2026-02-27
- [x] Avatar upload to Supabase Storage with initials fallback — 2026-02-27
- [x] `delete_user_account()` RPC function for cascading account deletion — 2026-02-27

### Onboarding Flow
- [x] Downloaded 7 use case icons from Figma (`public/assets/icons/onboarding-*.svg`) — 2026-02-25
- [x] Multi-step onboarding: name, referral source, use case selection — 2026-02-25
- [x] Editor guided tour (`src/components/editor/tour/editor-tour.tsx`) — 3-step tooltip walkthrough — 2026-02-25
- [x] Auth callback redirects new users to `/onboarding`, returning users to `/dashboard` — 2026-02-25
- [x] Onboarding state stored in Supabase `user_metadata` — 2026-02-25

### Phase 3 — AI Chat & Generation + Billing Plans
- [x] Provider-agnostic AI types: ModelGenerationProvider, GenerationResult, TaskStatus, GenOptions (`src/lib/ai/types.ts`) — 2026-02-27
- [x] MeshyProvider: text-to-3D, image-to-3D, status polling via Meshy API v2 (`src/lib/ai/meshy-provider.ts`) — 2026-02-27
- [x] Generation service: provider registry, normalizePrompt, downloadModel (`src/lib/ai/generation-service.ts`) — 2026-02-27
- [x] Chat service: Claude-powered scene manipulation returning EditorAction[], action validation (`src/lib/ai/chat-service.ts`) — 2026-02-27
- [x] API route: POST/GET /api/projects/[id]/chat — send messages, load history, persist to ai_conversations — 2026-02-27
- [x] API route: POST /api/projects/[id]/generate — text-to-3D with cache check, rate limiting, generation count — 2026-02-27
- [x] API route: GET /api/projects/[id]/generate/[jobId] — poll status, auto-download + store completed models — 2026-02-27
- [x] Billing plan configs: Free ($0/5 gens), Standard ($30/75), Pro ($60/175), Mega ($120/500) — 2026-02-27
- [x] Billing columns added to profiles: plan, generation_limit, generations_used, billing_cycle_start — 2026-02-27
- [x] Chat panel wired: send messages to Claude, dispatch EditorAction[], generation with progress polling — 2026-02-27
- [x] Billing tab redesigned: 4 plan cards (2x2 grid), monthly/annual toggle, usage progress bar — 2026-02-27
- [x] /api/user returns billing info (plan, generations_used, generation_limit) — 2026-02-27

### Phase 4 — Asset Pipeline, Export, Free Tier, Validation
- [x] Asset API: POST/GET /api/projects/[id]/assets — upload 3D models/textures with MIME validation, size limits (50MB) — 2026-02-27
- [x] Asset API: GET/DELETE /api/projects/[id]/assets/[assetId] — get with signed URL, delete with storage cleanup — 2026-02-27
- [x] Scene renderer updated: supports both primitives AND GLB model loading via `useGLTF` with Suspense fallback — 2026-02-27
- [x] GLB Export: client-side export via Three.js GLTFExporter, builds scene from store data (no Canvas needed) — 2026-02-27
- [x] Export button wired in right sidebar — downloads scene.glb — 2026-02-27
- [x] Export API: POST /api/projects/[id]/export — returns scene data + asset URLs + watermark flag per plan — 2026-02-27
- [x] Free tier project limit enforcement: POST /api/projects checks profiles.plan and rejects if limit reached — 2026-02-27
- [x] Zod validation on all API routes: projects, user, chat, generate, scene, assets, export — 2026-02-27
- [x] Standardized error responses: `{ error, code, details }` format via `apiError()` helper — 2026-02-27
- [x] Dashboard plan display fixed: shows actual plan from profiles table instead of hardcoded "Max plan" — 2026-02-27
- [x] Left sidebar plan display fixed: loads plan from profiles table instead of user_metadata — 2026-02-27

### Phase 5 — Polish & Scale
- [x] Pagination on GET /api/projects: `?page=&limit=` with `{ data, shared, pagination }` response — 2026-02-27
- [x] Soft deletes: `deleted_at` column on projects, DELETE sets timestamp instead of hard delete — 2026-02-27
- [x] Sharing API: POST/GET /api/projects/[id]/shares — add collaborator by email, list collaborators with profiles — 2026-02-27
- [x] Sharing API: PUT/DELETE /api/projects/[id]/shares/[shareId] — update permission, remove collaborator — 2026-02-27
- [x] `get_user_id_by_email` RPC function (SECURITY DEFINER) for user lookup in sharing flow — 2026-02-27
- [x] Shared projects returned in GET /api/projects response (`shared` array) — 2026-02-27
- [x] GET /api/projects/[id] allows access for shared collaborators (not just owner) — 2026-02-27
- [x] RLS policies: owners can INSERT/UPDATE/DELETE shares, editors can manage shared scenes — 2026-02-27
- [x] Database migrations tracked in `supabase/migrations/` (3 migration files) — 2026-02-27
- [x] Dashboard pagination UI: Previous/Next buttons with page indicator — 2026-02-27
- [x] Dashboard soft delete: "Move to trash?" confirmation, project removed from UI — 2026-02-27
- [x] TypeScript types updated: `deleted_at` added to projects in `database.ts` — 2026-02-27
- [x] Google OAuth confirmed configured on Supabase Dashboard — 2026-02-27

## In Progress
- (none)

## Blocked / Deferred
- shadcn/ui not yet installed — using plain Tailwind for now.
- Stripe/Paddle payment integration — plan switching is frontend-only, no real payment processing yet.
- Non-primitive model export — GLB export currently builds primitives only; loaded GLB models are skipped (need to be fetched from URL first).
- FBX/OBJ/STL export formats — only GLB is supported currently.
- Watermark injection for Free tier — metadata flag is set but no visual watermark in exported file.
- Sharing UI on dashboard — API is wired but no frontend for inviting/viewing collaborators yet.
- Trash/restore UI — soft delete is in place but no way to view or restore trashed projects from the dashboard.

## Decisions & Notes
- Used Lucide React icons for editor toolbar since Figma MCP was initially rate-limited. Icons are centralized for easy swap.
- Used dark theme color palette as CSS custom properties in `globals.css`.
- Sign-in page uses warm earth tones from Figma: #101010 bg, #141413 card, #c2c0b6 title, #faf9f5 button.
- Supabase project ID: `ayhbxyyyzwutsjstradu`, region: `us-east-1`, org: `Kreos`.
- Email auth uses magic link (OTP) rather than password — simpler UX, no password storage.
- Auto-save uses `navigator.sendBeacon` on `beforeunload` for reliable save-on-close.
- AI chat uses Claude claude-sonnet-4-6 for scene manipulation. System prompt includes full scene context + EditorAction schema.
- AI actions are validated before dispatch: object ID existence, numeric bounds, material value clamping.
- Generation prompt normalization (lowercase + trim + collapse whitespace) enables exact-match caching via `assets.ai_prompt`.
- Billing cycle reset is checked on each generation request (monthly rolling window).
- Chat history is stored in `ai_conversations` table, trimmed to last 100 messages.
- Generation requests that match a cached `ai_prompt` in the `assets` table skip the Meshy API call entirely.
- Zod validation added to all API routes. Schemas centralized in `src/lib/api/validation.ts`.
- All API errors use standardized `{ error, code, details }` format via `apiError()` helper.
- GLB export builds a Three.js scene from store data (no Canvas/R3F context needed), exports via GLTFExporter, and disposes resources after.
- Asset uploads validated for MIME type + extension fallback + 50MB size limit. Storage path: `{userId}/{projectId}/{assetId}.{ext}`.
- Free tier enforced at project creation time by checking `profiles.plan` + counting existing projects vs `PLAN_CONFIGS.projectLimit`.
- Soft deletes: DELETE /api/projects/[id] sets `deleted_at` timestamp instead of removing the row. All list/get queries filter `WHERE deleted_at IS NULL`.
- Free tier project count excludes soft-deleted projects (they don't count against the limit).
- Sharing uses `get_user_id_by_email` RPC (SECURITY DEFINER) to look up users by email without exposing `auth.users`.
- Database migrations tracked in `supabase/migrations/` — 3 files covering soft deletes, sharing RLS, and user lookup RPC.
- Pagination defaults: page=1, limit=20, max limit=100. Response includes `{ data, shared, pagination: { page, limit, total, pages } }`.

## Known Issues
- THREE.js warnings in console: "THREE.Clock: This module has been deprecated" and "PCFSoftShadowMap has been removed" — cosmetic, from drei/three version mismatch.
- Pre-existing lint errors in `transform-gizmo.tsx` — refs accessed during render (React 19 strict mode warning).

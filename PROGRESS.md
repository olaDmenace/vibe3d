# Progress Tracker

## Current Phase
Phase 6 — Final Features Before Launch

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

### Phase 6 — Final Features Before Launch
- [x] Whop Billing: installed @whop/sdk, created whop.ts client + plan ID mapping — 2026-02-27
- [x] Whop Billing: POST /api/billing/checkout — creates Whop checkout session with plan_id + metadata — 2026-02-27
- [x] Whop Billing: POST /api/webhooks/whop — webhook handler with signature verification, handles payment.succeeded, membership.activated/deactivated, payment.failed — 2026-02-27
- [x] Whop Billing: GET /api/billing/subscription — returns current plan, config, usage, cycle start — 2026-02-27
- [x] Whop Billing: Settings modal billing tab wired to create Whop checkout + redirect — 2026-02-27
- [x] Whop Billing: Dashboard handles `?billing=success` return URL, reloads profile plan — 2026-02-27
- [x] Non-primitive model export: GLB models loaded from `obj.metadata.modelUrl` via GLTFLoader during export — 2026-02-27
- [x] OBJ export via OBJExporter — 2026-02-27
- [x] STL export via STLExporter — 2026-02-27
- [x] Export format selector in right sidebar: GLB/OBJ/STL dropdown — 2026-02-27
- [x] Visual watermark for Free tier exports: CanvasTexture on PlaneGeometry added to exported scene — 2026-02-27
- [x] Image-to-3D frontend: image upload in chat panel → Supabase Storage → generate API with imageUrl — 2026-02-27
- [x] Sharing modal: email invite, permission selector (view/edit/admin), collaborator list, remove button — 2026-02-27
- [x] Sharing modal wired into right sidebar Share button — 2026-02-27
- [x] Trash & Restore UI: modal with trashed projects list, restore button, permanent delete button — 2026-02-27
- [x] Trash API routes: GET /api/projects/trash, POST /api/projects/[id]/restore, DELETE /api/projects/[id]/permanent — 2026-02-27
- [x] Trash button added to dashboard filter row — 2026-02-27
- [x] CLAUDE.md updated: Whop SDK added to tech stack — 2026-02-27
- [x] .env.example updated: WHOP_API_KEY, WHOP_WEBHOOK_SECRET, WHOP_COMPANY_ID, SUPABASE_SERVICE_ROLE_KEY — 2026-02-27

### Phase 7 — i18n, Email, UX Polish
- [x] i18n: next-intl installed and configured (no i18n routing — locale stored in cookie) — 2026-02-27
- [x] i18n: translation files for EN, FR, ES, IT (`messages/*.json`) — 2026-02-27
- [x] i18n: `src/i18n/request.ts` (server locale resolution), `src/i18n/locales.ts` (shared constants) — 2026-02-27
- [x] i18n: `NextIntlClientProvider` in root layout, server action `setLocale` for switching — 2026-02-27
- [x] i18n: Settings language dropdown wired to actual locale switching with page refresh — 2026-02-27
- [x] Email: Resend + @react-email/components installed — 2026-02-27
- [x] Email: Welcome email template (`src/components/emails/welcome-email.tsx`) — 2026-02-27
- [x] Email: Generation complete email template (`src/components/emails/generation-complete-email.tsx`) — 2026-02-27
- [x] Email: Invite email template (`src/components/emails/invite-email.tsx`) — 2026-02-27
- [x] Email: Send functions (`src/lib/email/send-*.ts`) — fire-and-forget pattern — 2026-02-27
- [x] Email: Welcome email wired into auth callback for new users — 2026-02-27
- [x] Email: Invite email wired into POST /api/projects/[id]/shares — 2026-02-27
- [x] Dashboard: Voice input via Web Speech API (SpeechRecognition) — 2026-02-27
- [x] Dashboard: File attach button wired to file input (image upload → create project) — 2026-02-27
- [x] Dashboard: Submit button added to prompt area — 2026-02-27
- [x] TypeScript: Web Speech API type declarations (`src/types/speech.d.ts`) — 2026-02-27
- [x] Fix: CORS — Poll endpoint now returns Supabase signed URL instead of raw Meshy CDN URL — 2026-02-27
- [x] Fix: Dashboard prompt now auto-triggers generation in editor via sessionStorage handoff — 2026-02-27

### Bug Fixes — Generation & UX — 2026-03-02
- [x] Fixed: Generation polling adding model to scene multiple times — replaced setInterval with chained setTimeout + one-shot gate ref (`generationHandledRef`)
- [x] Fixed: Object names from generation now cleaned via `cleanPromptForName()` ("Create a 3D chess Piece" → "Chess Piece")
- [x] Generation loading overlay (`src/components/editor/viewport/generation-overlay.tsx`): spinner + prompt + progress bar shown over viewport during generation
- [x] Generation store (`src/store/generation-store.ts`) for cross-component generation status sharing
- [x] Dashboard → Editor handoff shows loading overlay immediately on editor mount (before API response)
- [x] Generation progress from Meshy API polling fed into both overlay progress bar and chat progress bar

### Code Review Fixes & Improvements — 2026-03-02
- [x] Fix 1: Transform coordinates — destructured array deps to individual numbers so Immer structural sharing doesn't skip useEffect updates
- [x] Fix 2: SelectionOverlay — wrapped Box3/Vector3 computations in useMemo to avoid allocations every render
- [x] Fix 4: Chat route accepts client-provided sceneState — avoids stale DB reads, falls back to DB if not provided
- [x] Fix 5: Chat route — added soft-delete filter (`.is("deleted_at", null)`) and try/catch around Anthropic API with typed error responses (rate limit / timeout / generic → 503)
- [x] Fix 6: Singleton Anthropic client — lazy module-level initialization instead of new instance per call
- [x] Fix 7: AI system prompt — includes meshCount, current materialOverrides, CRITICAL section for single-mesh vs multi-mesh targeting rules
- [x] Fix 8: Generation prompt expansion — `expandPromptForGeneration()` enriches short prompts with quality modifiers for better Meshy results
- [x] Fix 9: Generate route uses expanded prompt for Meshy API but stores original for cache matching
- [x] Fix 10: Generation detection regex — now matches "can you generate...", "I want to make...", "build me a...", etc.
- [x] Fix 11: Auto-offset new primitives — X position offset based on object count so objects don't stack
- [x] Fix 12+14: Command-based undo/redo — replaced full structuredClone snapshots with `{ forward, backward }` action pairs; computeInverseAction for all action types; maxHistorySize 50 (lightweight entries)
- [x] Fix 13: Migrated AI chat from XML tag parsing to Anthropic tool_use — structured schema enforcement, removed parseActionsFromReply, added meshName stripping in validateActions for single-mesh models
- [x] Fix 15: Per-user rate limiting on chat endpoint — in-memory Map, 30 messages/minute window, 429 response
- [x] Fix 16: Unauthenticated editor mode — useAuthStatus hook, disabled chat input with sign-in link, EditorToolbar accepts isAuthenticated prop

### Post-Generation Mesh Segmentation — 2026-03-03
- [x] Mesh segmenter utility (`src/lib/three/mesh-segmenter.ts`): Union-Find connected component analysis + vertex color clustering to split single-mesh AI-generated models into editable parts
- [x] Integration into generation polling route (`[jobId]/route.ts`): segmentation runs between model download and Supabase upload; meshNames/meshCount stored in asset metadata and returned in response
- [x] Chat panel updated: ADD_OBJECT dispatched with meshNames/meshCount in metadata; completion message lists editable parts for multi-mesh models
- [x] Asset upload route updated: GLB uploads automatically segmented; meshNames/meshCount stored in asset metadata
- [x] Fallback handling: segmentation errors gracefully fall back to original unsegmented model with single-mesh metadata
- [x] Installed @gltf-transform/core, @gltf-transform/extensions, @gltf-transform/functions for server-side GLB parsing

### Generation Polling & Reliability — 2026-03-03
- [x] Exponential backoff on generation polling (3s initial → 1.5x growth → 15s cap) — reduces wasted requests from ~40 to ~15 for typical 60s generation
- [x] Max poll limit (60 polls / ~5 min) with graceful timeout message instead of polling forever
- [x] Auto-retry on transient Meshy failures (busy/429/503) — 2 retries on generate, 1 retry on status poll, with exponential delay
- [x] Cleaned up error messages: no double periods, categorized messages for busy/timeout/generic failures
- [x] Elapsed time display in generation overlay — `startedAt` field in generation store, live counter in overlay

### Autonomous Fix Pass — 2026-03-03
- [x] Generation polling: exponential backoff (3s-15s), max 60 polls, chained setTimeout
- [x] Generation deduplication: one-shot ref gate prevents 5x model add
- [x] Error messages: cleaned up double-period and redundant text
- [x] Object naming: prompt cleaning (strip verbs/articles, capitalize)
- [x] Primitive offset: new objects spread along X axis
- [x] Meshy retry: withRetry wrapper for transient 503/busy errors
- [x] Generation overlay: spinner, progress bar, elapsed time, prompt display
- [x] Generation store: cross-component generation state (Zustand)
- [x] Dashboard handoff: overlay shows immediately on editor mount
- [x] Undo history: capped at 30 entries
- [x] Material disposal: GLB clone materials disposed on change and unmount
- [x] Bounding box: memoized in selection overlay
- [x] Transform sync: destructured array deps for reliable useEffect firing

### Model Quality & Segmentation — 2026-03-03
- [x] Meshy provider: two-step preview+refine pipeline for higher quality models
- [x] Default art_style set to "realistic" for all generations
- [x] Prompt expansion improved with category-specific structural hints
- [x] Segmentation capped at 12 parts max (excess merged into largest)
- [x] Minimum component thresholds raised from fixed count to 5% of total vertices
- [x] Color merge threshold increased (bucket size 32 → 64) to reduce over-segmentation
- [x] Chat success message truncated to show first 6 part names

### Sub-Part Interaction — 2026-03-03
- [x] MeshPartsPanel in right sidebar: per-part color swatches, click-to-highlight, hover-to-preview, native color picker, reset button
- [x] Viewport mesh highlighting: amber (#f59e0b) wireframe overlay on highlighted mesh, blue overlay when no mesh selected
- [x] Viewport click-to-identify: clicking a mesh within a selected model toggles its highlight via ThreeEvent
- [x] Scene hierarchy mesh expansion: expandable mesh children under generated models, part count badge ("3p"), amber highlight on hover/click
- [x] MeshPartsList component: indented mesh part rows in hierarchy with amber border + text color on selection
- [x] highlightedMeshName state: added to EditorStore, auto-cleared on object deselection (SELECT_OBJECT dispatch)
- [x] Spatial mesh naming: replaced index-based naming with spatial+size analysis — parts named "body", "top", "base", "left_section", "right_section", "front", "back", "detail" based on bounding box position relative to model center and volume ratio

### Launch Sprint — Complete Fix Pass — 2026-03-04
- [x] Fix 1 (BLOCKER): Chat routing — replaced broad generation regex with `isGenerationRequest()` function + exclusion patterns for edit commands ("make the windows pink" no longer triggers 3D generation)
- [x] Fix 2: Object naming — improved `cleanPromptForName()` (strips "please", "new", trailing "for my scene" etc.) + removed prompt prefix from mesh segmenter part names
- [x] Fix 3: Auto-offset — new generated objects spawn offset from existing objects via `getSpawnPosition()` utility, no more stacking at [0,0,0]
- [x] Fix 4: Material editor — `MaterialEditor` component with color picker + roughness/metalness/opacity sliders, per-mesh targeting via `highlightedMeshName`
- [x] Fix 5: Delete objects — right-click viewport context menu (duplicate/hide/lock/delete) + keyboard shortcuts (Delete/Backspace)
- [x] Fix 6: Undo/Redo buttons — visible toolbar buttons with disabled state, connected to store undo/redo
- [x] Fix 7: Primitives toolbar — added torus primitive, uses `getSpawnPosition()` for offset spawning
- [x] Fix 8: Parts panel — enlarged color swatches (w-6 h-6 with border), added title attributes
- [x] Fix 9: Scene hierarchy — right-click context menu (rename/duplicate/hide/delete), double-click inline rename with Enter/Escape support
- [x] Fix 10: Multi-object selection — shift-click in hierarchy, blue border for multi-selected items, batch delete via keyboard
- [x] Fix 11: Snap-to-grid — toggle button in toolbar with visual state, TransformControls snap props (translation/rotation/scale), store `snapToGrid` boolean

## In Progress
- (none)

## Blocked / Deferred
- shadcn/ui not yet installed — using plain Tailwind for now.
- FBX export: no reliable client-side FBX exporter exists for Three.js — deferred indefinitely.
- Free tier export format restriction: free users should only see GLB (other formats greyed out with upgrade prompt) — not yet enforced in UI.
- View-only permission enforcement: view-only shared users should not be able to use transform tools or generate models — not yet enforced.
- Cron job for auto-purging trashed projects older than 30 days — not yet implemented.

## Decisions & Notes
- Used Lucide React icons for editor toolbar since Figma MCP was initially rate-limited. Icons are centralized for easy swap.
- Used dark theme color palette as CSS custom properties in `globals.css`.
- Sign-in page uses warm earth tones from Figma: #101010 bg, #141413 card, #c2c0b6 title, #faf9f5 button.
- Supabase project ID: `ayhbxyyyzwutsjstradu`, region: `us-east-1`, org: `Kreos`.
- Email auth uses magic link (OTP) rather than password — simpler UX, no password storage.
- Auto-save uses `navigator.sendBeacon` on `beforeunload` for reliable save-on-close.
- AI chat uses Claude claude-sonnet-4-6 for scene manipulation via tool_use (structured action output). System prompt includes full scene context + EditorAction schema.
- AI actions are validated before dispatch: object ID existence, numeric bounds, meshName stripping for single-mesh models.
- Generation prompt normalization (lowercase + trim + collapse whitespace) enables exact-match caching via `assets.ai_prompt`.
- Billing cycle reset is checked on each generation request (monthly rolling window).
- Chat history is stored in `ai_conversations` table, trimmed to last 100 messages.
- Generation requests that match a cached `ai_prompt` in the `assets` table skip the Meshy API call entirely.
- Zod validation added to all API routes. Schemas centralized in `src/lib/api/validation.ts`.
- All API errors use standardized `{ error, code, details }` format via `apiError()` helper.
- Whop SDK (`@whop/sdk`) used for billing. `Whop` class (default export), not `WhopServerSdk`. Checkout via `checkoutConfigurations.create()`, webhook verification via `webhooks.unwrap()`.
- Whop plan IDs updated with real IDs from Whop dashboard (Standard: plan_fRhaBzPCv7VO3/plan_tI2nKFluSA2FQ, Pro: plan_bX1vGvaf1VZ9J/plan_oCnzubavDuejn, Mega: plan_CZwBm3Cti4ege/plan_syiJyvcdDWPrl).
- Whop webhook handler uses Supabase service role client (no user context available in webhooks).
- Export supports GLB (GLTFExporter), OBJ (OBJExporter), STL (STLExporter). FBX deferred — no reliable client-side exporter.
- Non-primitive models loaded during export via GLTFLoader.parse() from `obj.metadata.modelUrl` signed URLs.
- GLB export builds a Three.js scene from store data (no Canvas/R3F context needed), exports via GLTFExporter, and disposes resources after.
- Visual watermark for free tier: CanvasTexture with text rendered on a PlaneGeometry, semi-transparent, added to the export scene root.
- Asset uploads validated for MIME type + extension fallback + 50MB size limit. Storage path: `{userId}/{projectId}/{assetId}.{ext}`.
- Free tier enforced at project creation time by checking `profiles.plan` + counting existing projects vs `PLAN_CONFIGS.projectLimit`.
- Soft deletes: DELETE /api/projects/[id] sets `deleted_at` timestamp instead of removing the row. All list/get queries filter `WHERE deleted_at IS NULL`.
- Free tier project count excludes soft-deleted projects (they don't count against the limit).
- Sharing uses `get_user_id_by_email` RPC (SECURITY DEFINER) to look up users by email without exposing `auth.users`.
- Database migrations tracked in `supabase/migrations/` — 3 files covering soft deletes, sharing RLS, and user lookup RPC.
- Pagination defaults: page=1, limit=20, max limit=100. Response includes `{ data, shared, pagination: { page, limit, total, pages } }`.

- Mesh segmentation pipeline: AI-generated GLB models are auto-segmented server-side using @gltf-transform. Strategy: (1) connected component analysis via Union-Find splits disjoint geometry islands, (2) vertex color clustering splits by dominant color groups. Segmented meshes get descriptive names (e.g. "Chess_Piece_Red_Part", "Chess_Piece_Body"). meshNames/meshCount are stored in asset metadata and passed to the editor store so the AI chat can target individual parts with UPDATE_MATERIAL overrides.
- Uploaded GLB files also run through the segmentation pipeline automatically.
- Segmentation gracefully falls back to the original model on error — models always load even if segmentation fails.

## Known Issues
- THREE.js warnings in console: "THREE.Clock: This module has been deprecated" and "PCFSoftShadowMap has been removed" — cosmetic, from drei/three version mismatch.
- Pre-existing lint errors in `transform-gizmo.tsx` — refs accessed during render (React 19 strict mode warning).

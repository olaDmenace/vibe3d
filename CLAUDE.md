# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: 3D AI Editor

A web-based 3D editor where users create, edit, save, download, and upload 3D models using AI-driven natural language commands alongside traditional manipulation tools.

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript (strict)
- @react-three/fiber, @react-three/drei, Three.js
- Zustand + Immer for state management
- Supabase (Postgres, Auth, Storage)
- Tailwind CSS v4 + shadcn/ui
- AI: Anthropic Claude API, Meshy API for 3D generation
- Billing: Whop SDK (@whop/sdk) for payments & subscriptions

## Architecture Rules

1. ALL state mutations go through EditorAction dispatch — never mutate Three.js directly
2. Three.js is a VIEW LAYER — it reads from the Zustand store
3. AI returns EditorAction[] — validate before dispatching
4. Every Three.js resource (geometry, material, texture) must be disposed on cleanup
5. Use Suspense boundaries around all model loading
6. Scene graph types are in `src/types/scene.ts`
7. Editor actions are in `src/types/actions.ts`
8. Store is in `src/store/editor-store.ts`
9. ALL colors, spacing, typography, and UI styling come from Figma via Figma MCP — never hardcode design tokens
10. ALL icons, graphics, and assets must be imported from the Figma file — do not generate your own. If an asset can't be extracted, use a named placeholder and log it in `PROGRESS.md` under "Blocked / Deferred"

## File Structure

```
PROGRESS.md              # Living progress tracker — update after every completed feature
CLAUDE.md                # This file
src/
  app/                    # Next.js App Router pages
    (auth)/               # Auth pages (login, signup)
    (editor)/             # Editor page
    (marketing)/          # Landing page
    api/                  # API routes
  components/
    editor/               # Editor-specific components
      viewport/           # 3D viewport components
      panels/             # Sidebar panels
      chat/               # AI chat interface
      toolbar/            # Top toolbar
    ui/                   # shadcn/ui components
  store/
    editor-store.ts       # Main editor Zustand store
    ui-store.ts           # UI-only state (no undo/redo)
  types/
    scene.ts              # Scene graph types
    actions.ts            # Editor action types
    database.ts           # Supabase types (generated)
  lib/
    supabase/             # Supabase client utilities
    ai/                   # AI integration utilities
    three/                # Three.js utilities (loaders, disposal, normalization)
  hooks/                  # Custom React hooks
```

## Commands

- `npm run dev` — Start development server (http://localhost:3000)
- `npm run build` — Production build
- `npm run lint` — Run ESLint (flat config, `eslint.config.mjs`)
- `npm test` — Run unit tests (Vitest)
- `npm run test:e2e` — Run E2E tests (Playwright)

## Default Scene State

When creating a new project, initialize with `DEFAULT_SCENE_STATE` from `src/store/editor-store.ts`. Colors for lighting and background should be derived from Figma design tokens at implementation time.

## Path Alias

`@/*` maps to the project root (configured in `tsconfig.json`).

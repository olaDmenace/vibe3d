# Vibe3D — UI POLISH: Design Token Alignment & Visual Consistency

The editor was built with hardcoded Tailwind neutral grays while the dashboard and auth pages use CSS variable design tokens from Figma. This makes the editor look like a different app. This prompt aligns everything.

Apply ALL sections. Verify after each.

---

## Section 1: Migrate editor to CSS variable design tokens

The design tokens are defined in `src/app/globals.css` under `:root` (light) and `html.dark` (dark). The editor should always use the dark theme. Key tokens:

```
--panel-bg: #1F1F18          (sidebar/panel backgrounds — warm dark, not cold gray)
--card-bg: #1F1F18           (cards, dropdowns)
--card-bg-hover: #2a2a26     (hover states)
--card-bg-secondary: #30302E (secondary surfaces)
--page-bg: #262624           (page background)

--border: rgba(222,220,209,0.15)      (default borders — subtle warm)
--border-subtle: rgba(255,255,255,0.06)  (very subtle dividers)
--border-strong: #444444              (emphasized borders)

--text-primary: #ffffff
--text-secondary: rgba(255,255,255,0.7)
--text-muted: rgba(255,255,255,0.52)
--text-dim: rgba(255,255,255,0.35)

--input-bg: rgba(255,255,255,0.05)
--input-bg-hover: rgba(255,255,255,0.08)

--accent-bg: rgba(255,255,255,0.06)    (subtle highlight)
--accent-bg-hover: rgba(255,255,255,0.1)
```

### Files to update

Search the entire `src/components/editor/` directory for hardcoded Tailwind color classes and replace with CSS variable equivalents. Here's the mapping:

```
bg-neutral-900    → bg-[var(--panel-bg)]
bg-neutral-800    → bg-[var(--card-bg-secondary)] or bg-[var(--input-bg)]
bg-neutral-700    → bg-[var(--accent-bg-hover)]
bg-neutral-750    → bg-[var(--accent-bg)]

border-neutral-800 → border-[var(--border-subtle)]
border-neutral-700 → border-[var(--border)]
border-neutral-600 → border-[var(--border-strong)]

text-neutral-300  → text-[var(--text-secondary)]
text-neutral-400  → text-[var(--text-muted)]
text-neutral-500  → text-[var(--text-dim)]
text-neutral-600  → text-[var(--text-dim)]
text-white        → text-[var(--text-primary)]

hover:bg-neutral-800 → hover:bg-[var(--accent-bg)]
hover:bg-neutral-700 → hover:bg-[var(--accent-bg-hover)]
```

**IMPORTANT:** Don't do a blind find-and-replace. Go file by file through:

1. `src/components/editor/editor-layout.tsx`
2. `src/components/editor/panels/right-sidebar.tsx`
3. `src/components/editor/panels/left-sidebar.tsx` (or scene hierarchy)
4. `src/components/editor/panels/mesh-parts-panel.tsx`
5. `src/components/editor/panels/material-editor.tsx`
6. `src/components/editor/panels/lighting-editor.tsx`
7. `src/components/editor/chat/chat-panel.tsx`
8. `src/components/editor/viewport/context-menu.tsx`
9. `src/components/editor/viewport/generation-overlay.tsx`
10. `src/components/editor/viewport/scene-renderer.tsx` (only HTML overlay parts)
11. Any toolbar components
12. `src/components/editor/viewport/empty-state-overlay.tsx`
13. `src/components/error-boundary.tsx`

For each file, replace the hardcoded neutral colors with the CSS variable equivalents. Read each file, understand the intent of each color usage, and map it to the correct token.

The editor viewport background (the Canvas area) should use `--page-bg` (#262624) or stay as-is if it's controlled by Three.js/R3F environment settings.

**Verify:**
```bash
npx tsc --noEmit
# Check no remaining hardcoded neutrals in editor components (some in Tailwind config are OK):
grep -rn "bg-neutral-\|border-neutral-\|text-neutral-" src/components/editor/ | head -30
```

Some instances are acceptable (e.g., inside string interpolation for dynamic classes). The goal is to eliminate the majority, not every last one.

---

## Section 2: Apply Aeonik Pro font to the editor

The dashboard uses Aeonik Pro as the body font but the editor likely uses the Tailwind default (Inter/system font).

**File:** `src/components/editor/editor-layout.tsx`

Add the font family to the root editor container:

```tsx
<div className="flex h-screen" style={{ fontFamily: "'Aeonik Pro', system-ui, sans-serif" }}>
```

Or better, add a utility class in `globals.css`:

```css
.font-body {
  font-family: 'Aeonik Pro', system-ui, -apple-system, sans-serif;
}
```

Then apply it to the editor root:
```tsx
<div className="flex h-screen font-body">
```

The project title in the top-left ("Create a modern building") should use PP Mondwest if it matches the dashboard heading style:

```tsx
<h1 style={{ fontFamily: "'PP Mondwest', Georgia, serif" }}>
  {project.name}
</h1>
```

**Verify:**
```bash
npx tsc --noEmit
grep -n "font-body\|Aeonik\|PP Mondwest" src/components/editor/ -r
```

---

## Section 3: Toolbar visual polish

The toolbar currently shows icons/buttons with functional but basic styling. Polish it:

### A. Group related controls with subtle separators

```tsx
{/* Tool group: Add + Primitives */}
<div className="flex items-center gap-1">
  <AddObjectMenu />
</div>

{/* Separator */}
<div className="w-px h-5 bg-[var(--border)]" />

{/* Tool group: Undo/Redo */}
<div className="flex items-center gap-1">
  <UndoRedoButtons />
</div>

{/* Separator */}
<div className="w-px h-5 bg-[var(--border)]" />

{/* Tool group: Camera controls */}
<div className="flex items-center gap-1">
  <CameraControls />
</div>

{/* Separator */}
<div className="w-px h-5 bg-[var(--border)]" />

{/* Tool group: Snap */}
<SnapToggle />
```

### B. Active tool state

The active transform tool (translate/rotate/scale) should have a clear active state:

```tsx
className={`p-1.5 rounded transition-colors ${
  isActive
    ? "bg-[var(--accent-bg-hover)] text-[var(--text-primary)]"
    : "text-[var(--text-dim)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-bg)]"
}`}
```

### C. Toolbar container styling

The toolbar bar itself should have a subtle bottom border and proper padding:

```tsx
<div className="flex items-center gap-2 px-3 h-10 border-b border-[var(--border)]">
```

**Verify:**
```bash
npx tsc --noEmit
```

---

## Section 4: Chat panel polish

### A. Chat message styling

User messages and AI messages should be visually distinct:

```tsx
{/* User message */}
<div className="flex justify-end">
  <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2.5 text-sm text-white">
    {message.content}
  </div>
</div>

{/* AI message */}
<div className="flex justify-start">
  <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-[var(--card-bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-secondary)]">
    {message.content}
  </div>
</div>

{/* System/status message (generation progress, errors) */}
<div className="flex justify-center">
  <div className="text-xs text-[var(--text-dim)] italic py-1">
    {message.content}
  </div>
</div>
```

### B. Chat input styling

The chat input should match the design language:

```tsx
<div className="border-t border-[var(--border)] p-3">
  <div className="relative">
    <textarea
      className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 pr-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
      placeholder="Describe what you want to create or change..."
      rows={2}
    />
    <button
      className="absolute right-3 bottom-3 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      type="submit"
    >
      {/* Send icon */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    </button>
  </div>
</div>
```

### C. Chat panel header

If the chat panel has a header/toggle, style it consistently:

```tsx
<div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
  <div className="flex items-center gap-2">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
    <span className="text-sm font-medium text-[var(--text-secondary)]">Vibe3D AI</span>
  </div>
  <button className="text-[var(--text-dim)] hover:text-[var(--text-secondary)] transition-colors">
    {/* Close/minimize icon */}
  </button>
</div>
```

**Verify:**
```bash
npx tsc --noEmit
```

---

## Section 5: Right sidebar section styling

Each section (Transform, Parts, Material, Lighting, Color Assets, etc.) should have consistent collapsible headers:

```tsx
function SidebarSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[var(--border-subtle)]">
      <button
        className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors"
        onClick={() => setOpen(!open)}
      >
        {title}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}
```

Use this wrapper for each section in the right sidebar. If a similar pattern already exists, update it to match this styling.

**Verify:**
```bash
npx tsc --noEmit
```

---

## Section 6: Context menu and dropdown polish

All context menus (viewport right-click, hierarchy right-click) and dropdowns (add object, export) should share consistent styling:

```css
/* Add to globals.css */
.dropdown-menu {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 4px;
  min-width: 180px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: background-color 0.1s, color 0.1s;
  cursor: pointer;
  width: 100%;
  text-align: left;
  border: none;
  background: none;
}

.dropdown-item:hover {
  background: var(--accent-bg);
  color: var(--text-primary);
}

.dropdown-item--danger {
  color: #f87171;
}

.dropdown-item--danger:hover {
  background: rgba(248, 113, 113, 0.1);
  color: #fca5a5;
}

.dropdown-separator {
  height: 1px;
  background: var(--border-subtle);
  margin: 4px 8px;
}
```

Then update all context menus and dropdowns to use these classes instead of inline Tailwind.

**Verify:**
```bash
npx tsc --noEmit
```

---

## Section 7: Slider styling

All range sliders (roughness, metalness, opacity, lighting intensity) should have a consistent custom appearance.

**File:** `src/app/globals.css`

```css
/* Custom range slider styling */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: var(--input-bg);
  border-radius: 4px;
  outline: none;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--text-primary);
  border: 2px solid var(--panel-bg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.1s;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--text-primary);
  border: 2px solid var(--panel-bg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

input[type="range"]:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
}
```

Then remove any inline `accent-indigo-500` or appearance classes from individual slider elements, since the global styles will handle it.

**Verify:**
```bash
npx tsc --noEmit
```

---

## Section 8: Left sidebar (hierarchy) polish

### A. Section header style

The "Scenes" header and search bar should match the dashboard design language:

```tsx
{/* Search */}
<div className="px-3 py-2">
  <div className="relative">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] py-1.5 pl-8 pr-3 text-xs text-[var(--text-secondary)] placeholder:text-[var(--text-dim)] focus:border-indigo-500/50 focus:outline-none transition-colors"
      placeholder="Search"
    />
  </div>
</div>
```

### B. Hierarchy item hover/selected states

```tsx
className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer rounded-lg mx-1.5 transition-colors ${
  isSelected
    ? "bg-[var(--accent-bg-hover)] text-[var(--text-primary)]"
    : "text-[var(--text-muted)] hover:bg-[var(--accent-bg)] hover:text-[var(--text-secondary)]"
}`}
```

### C. Mesh part children indent

Mesh children should have a subtle left border for visual hierarchy:

```tsx
<div className="ml-4 border-l border-[var(--border-subtle)] pl-2 space-y-0.5">
```

**Verify:**
```bash
npx tsc --noEmit
```

---

## Section 9: Selection wireframe color

The blue selection wireframe (#6366f1) is the Vibe3D accent/indigo. That's fine. But the mesh highlight wireframe (amber #f59e0b) should be slightly softer. Change it to a warm accent that fits the warm dark theme:

**File:** `src/components/editor/viewport/scene-renderer.tsx`

```tsx
// SelectionOverlay: keep indigo
<meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.3} />

// MeshHighlight: use a warm gold instead of harsh amber
<meshBasicMaterial color="#d4a853" wireframe transparent opacity={0.4} />
```

**Verify:**
```bash
npx tsc --noEmit
```

---

## Section 10: Save status and toolbar micro-details

### A. Save status dot

Make the save status indicator blend better:

```tsx
// In SaveStatusIndicator:
<span className="text-[11px] text-[var(--text-dim)] flex items-center gap-1.5 font-body">
  <span className={`w-1.5 h-1.5 rounded-full ${
    isSaving ? "bg-amber-400 animate-pulse" :
    isDirty ? "bg-amber-400" :
    lastSavedAt ? "bg-emerald-500" : ""
  }`} />
  {label}
</span>
```

### B. Export button style

Match the dashboard button style:

```tsx
<button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-[var(--text-secondary)] border border-[var(--border)] rounded-lg hover:bg-[var(--accent-bg)] transition-colors">
  Export .glb
  <svg width="12" height="12" ...chevron... />
</button>
```

### C. Share button (if present)

```tsx
<button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-[var(--text-primary)] bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">
  Share
</button>
```

**Verify:**
```bash
npx tsc --noEmit
```

---

## Section 11: Empty state and error boundary polish

### A. Empty state — match brand

Update the empty state overlay to use design tokens and Aeonik Pro:

```tsx
<h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2 font-body">
  Your scene is empty
</h3>
<p className="text-sm text-[var(--text-dim)] mb-6 leading-relaxed font-body">
  Add a primitive shape from the toolbar, or describe what you want to create in the chat.
</p>
<button className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-body">
  Add a Cube
</button>
```

### B. Error boundary — subtle, not alarming

```tsx
<div className="flex items-center justify-center h-full bg-[var(--panel-bg)] p-4">
  <div className="text-center max-w-xs">
    <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[var(--accent-bg)] flex items-center justify-center">
      <svg ... className="text-[var(--text-dim)]" />
    </div>
    <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1 font-body">
      Something went wrong
    </h3>
    <p className="text-xs text-[var(--text-dim)] mb-3 font-body">
      {error.message}
    </p>
    <button className="px-3 py-1.5 text-xs bg-[var(--card-bg-secondary)] hover:bg-[var(--accent-bg-hover)] text-[var(--text-secondary)] border border-[var(--border)] rounded-lg transition-colors font-body">
      Try Again
    </button>
  </div>
</div>
```

---

## Section 12: Generation overlay polish

**File:** `src/components/editor/viewport/generation-overlay.tsx`

The overlay shown during model generation should feel premium:

```tsx
<div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
  <div className="text-center max-w-sm">
    {/* Spinner */}
    <div className="w-10 h-10 mx-auto mb-4">
      <svg className="animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>

    <p className="text-sm font-medium text-[var(--text-primary)] mb-1 font-body">
      Generating "{promptName}"
    </p>
    <p className="text-xs text-[var(--text-dim)] mb-4 font-body">
      This usually takes 1-2 minutes
    </p>

    {/* Progress bar */}
    <div className="w-48 mx-auto h-1 bg-[var(--input-bg)] rounded-full overflow-hidden">
      <div
        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
    <p className="text-[11px] text-[var(--text-dim)] mt-2 font-mono">
      {progress}%
    </p>
  </div>
</div>
```

---

## Final Verification

```bash
npx tsc --noEmit && echo "TS PASS" || echo "TS FAIL"
npm run lint && echo "LINT PASS" || echo "LINT FAIL"
npm run build && echo "BUILD PASS" || echo "BUILD FAIL"
```

## Update PROGRESS.md

```markdown
### UI Polish Pass — YYYY-MM-DD
- [x] Migrated editor components from hardcoded Tailwind neutrals to CSS variable design tokens
- [x] Applied Aeonik Pro font to editor, PP Mondwest to project title
- [x] Toolbar: grouped controls with separators, consistent active/hover states
- [x] Chat panel: distinct user/AI message bubbles, polished input with send button
- [x] Right sidebar: collapsible sections with consistent headers
- [x] Context menus & dropdowns: shared .dropdown-menu/.dropdown-item classes
- [x] Range sliders: custom thumb/track styling via globals.css
- [x] Left sidebar: polished search, hierarchy item states, mesh child indentation
- [x] Selection wireframe: indigo for selection, warm gold for mesh highlight
- [x] Save status: subtle 1.5px dot with 11px label
- [x] Empty state & error boundaries: aligned to design token system
- [x] Generation overlay: blur backdrop, indigo spinner, progress bar
```

# Vibe3D — DAY 6: Final Polish + Onboarding

The last code day. Tooltips, keyboard shortcut panel, first-time user hints, and every remaining rough edge.

Apply ALL sections.

---

## Section 1: Keyboard shortcuts help panel

Show all shortcuts in a modal when user presses `?` or clicks a help button.

### A. Shortcuts data

**File:** Create `src/lib/keyboard-shortcuts.ts`

```ts
export interface ShortcutGroup {
  title: string;
  shortcuts: Array<{ keys: string[]; description: string }>;
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: ["Ctrl", "Z"], description: "Undo" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Redo" },
      { keys: ["Ctrl", "D"], description: "Duplicate selected" },
      { keys: ["Delete"], description: "Delete selected" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Tools",
    shortcuts: [
      { keys: ["V"], description: "Select tool" },
      { keys: ["G"], description: "Translate (move)" },
      { keys: ["R"], description: "Rotate" },
      { keys: ["S"], description: "Scale" },
    ],
  },
  {
    title: "Camera",
    shortcuts: [
      { keys: ["Home"], description: "Reset camera view" },
      { keys: ["F"], description: "Zoom to fit all objects" },
      { keys: ["Scroll"], description: "Zoom in/out" },
      { keys: ["Middle drag"], description: "Pan" },
      { keys: ["Left drag"], description: "Orbit" },
    ],
  },
  {
    title: "Selection",
    shortcuts: [
      { keys: ["Click"], description: "Select object" },
      { keys: ["Shift", "Click"], description: "Multi-select" },
      { keys: ["Escape"], description: "Deselect all" },
    ],
  },
];
```

### B. Shortcuts modal component

**File:** Create `src/components/editor/shortcuts-modal.tsx`

```tsx
"use client";

import { useEffect } from "react";

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="bg-[var(--panel-bg)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-lg w-full mx-4 pointer-events-auto max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
            <h2 className="text-sm font-medium text-[var(--text-primary)]">Keyboard Shortcuts</h2>
            <button
              className="text-[var(--text-dim)] hover:text-[var(--text-secondary)] transition-colors"
              onClick={onClose}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="text-xs font-medium text-[var(--text-dim)] uppercase tracking-wider mb-2">
                  {group.title}
                </h3>
                <div className="space-y-1.5">
                  {group.shortcuts.map((shortcut, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-sm text-[var(--text-secondary)]">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, j) => (
                          <span key={j}>
                            <kbd className="px-1.5 py-0.5 text-[11px] bg-[var(--card-bg-secondary)] border border-[var(--border)] rounded text-[var(--text-muted)] font-mono">
                              {key}
                            </kbd>
                            {j < shortcut.keys.length - 1 && (
                              <span className="text-[var(--text-dim)] text-xs mx-0.5">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

import { SHORTCUT_GROUPS } from "@/lib/keyboard-shortcuts";
```

### C. Wire into editor layout

Add state and trigger:

```tsx
const [showShortcuts, setShowShortcuts] = useState(false);

// Add to keydown handler:
if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
  e.preventDefault();
  setShowShortcuts(true);
}

// Add Escape handler:
if (e.key === "Escape") {
  if (showShortcuts) {
    setShowShortcuts(false);
    return;
  }
  dispatch({ type: "SELECT_OBJECT", id: null });
}

// Render:
<ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
```

### D. Help button in toolbar

Add a small `?` button in the toolbar:

```tsx
<button
  className="p-1.5 rounded text-[var(--text-dim)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-bg)] transition-colors"
  onClick={() => setShowShortcuts(true)}
  title="Keyboard shortcuts (?)"
>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
</button>
```

**Verify:**
```bash
npx tsc --noEmit
```

---

## Section 2: First-time user onboarding hints

Show contextual hints that appear once and dismiss permanently.

### A. Hint system using localStorage

Wait — artifacts can't use localStorage. Use a simple in-memory state for the session instead. Hints reset each session but that's fine for v1.

**File:** Create `src/components/editor/onboarding-hints.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";

interface Hint {
  id: string;
  target: string; // CSS selector or area identifier
  message: string;
  position: "top" | "bottom" | "left" | "right";
}

const HINTS: Hint[] = [
  {
    id: "add-objects",
    target: "toolbar-add",
    message: "Click + to add 3D primitives like cubes, spheres, and more",
    position: "bottom",
  },
  {
    id: "chat-generate",
    target: "chat-input",
    message: "Type here to generate 3D models with AI or edit your scene",
    position: "top",
  },
  {
    id: "export",
    target: "export-button",
    message: "Export your scene as .glb, .obj, or .stl when you're done",
    position: "bottom",
  },
];

export function OnboardingHints() {
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  // Show hints after a short delay
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (dismissed || !visible || currentHintIndex >= HINTS.length) return null;

  const hint = HINTS[currentHintIndex];

  function nextHint() {
    if (currentHintIndex < HINTS.length - 1) {
      setCurrentHintIndex((i) => i + 1);
    } else {
      setDismissed(true);
    }
  }

  function dismissAll() {
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-indigo-600 text-white rounded-xl px-4 py-3 shadow-lg max-w-sm flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm">{hint.message}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[11px] text-indigo-200">
              {currentHintIndex + 1} of {HINTS.length}
            </span>
            <button
              className="text-[11px] text-indigo-200 hover:text-white underline"
              onClick={dismissAll}
            >
              Skip all
            </button>
          </div>
        </div>
        <button
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
          onClick={nextHint}
        >
          {currentHintIndex < HINTS.length - 1 ? "Next" : "Got it"}
        </button>
      </div>
    </div>
  );
}
```

### B. Mount in editor layout

```tsx
import { OnboardingHints } from "./onboarding-hints";

// Inside the editor layout, as the last child:
<OnboardingHints />
```

**Verify:**
```bash
npx tsc --noEmit
```

---

## Section 3: Tooltips on all toolbar buttons

Ensure every toolbar button has a descriptive `title` attribute. Check all toolbar components and add titles where missing:

```tsx
// Every button should have: title="Action Name (shortcut)"
<button title="Select tool (V)" ...>
<button title="Translate (G)" ...>
<button title="Rotate (R)" ...>
<button title="Scale (S)" ...>
<button title="Add object (+)" ...>
<button title="Undo (Ctrl+Z)" ...>
<button title="Redo (Ctrl+Shift+Z)" ...>
<button title="Reset camera (Home)" ...>
<button title="Zoom to fit (F)" ...>
<button title="Snap to grid" ...>
<button title="Keyboard shortcuts (?)" ...>
```

Go through each toolbar component and verify every interactive element has a title. Add any that are missing.

**Verify:**
```bash
grep -n 'title=' src/components/editor/editor-layout.tsx | wc -l
# Should have 10+ titled elements
```

---

## Section 4: Loading state for the chat AI response

When the user sends a message and waits for Claude's response, show typing indicators:

**File:** `src/components/editor/chat/chat-panel.tsx`

Add a typing indicator when waiting for AI:

```tsx
const [isAITyping, setIsAITyping] = useState(false);

// Set before calling AI:
setIsAITyping(true);

// Clear after response:
setIsAITyping(false);

// Render at the bottom of messages:
{isAITyping && (
  <div className="flex justify-start">
    <div className="rounded-2xl rounded-bl-sm bg-[var(--card-bg-secondary)] px-4 py-3">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-dim)] animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-dim)] animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-dim)] animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  </div>
)}
```

---

## Section 5: Escape key deselects everything

**File:** Editor layout or keydown handler

Make sure Escape clears both object selection and mesh highlighting:

```ts
if (e.key === "Escape") {
  const { selectedObjectId, highlightedMeshName } = useEditorStore.getState();

  // First clear mesh highlight, then clear object selection
  if (highlightedMeshName) {
    useEditorStore.setState({ highlightedMeshName: null });
  } else if (selectedObjectId) {
    dispatch({ type: "SELECT_OBJECT", id: null });
  }
}
```

---

## Section 6: Smooth transitions and micro-animations

**File:** `src/app/globals.css`

Add utility animation classes:

```css
/* Slide in from bottom */
@keyframes slide-in-from-bottom {
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Fade in */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-in {
  animation: fade-in 0.2s ease-out, slide-in-from-bottom 0.2s ease-out;
}

/* Sidebar section collapse transition */
.section-content {
  transition: max-height 0.2s ease-out, opacity 0.15s ease-out;
  overflow: hidden;
}

/* Smooth color transitions on all interactive elements */
button, a, [role="button"] {
  transition: color 0.15s, background-color 0.15s, border-color 0.15s, opacity 0.15s;
}
```

---

## Section 7: Polish the generation overlay text

**File:** `src/components/editor/viewport/generation-overlay.tsx`

Make the generation messages more human:

```ts
function getGenerationMessage(progress: number): string {
  if (progress < 10) return "Starting generation...";
  if (progress < 30) return "Creating base geometry...";
  if (progress < 50) return "Shaping the model...";
  if (progress < 60) return "Refining details...";
  if (progress < 80) return "Applying textures...";
  if (progress < 95) return "Almost there...";
  return "Finalizing...";
}
```

Use this in the overlay instead of a static message.

---

## Section 8: Final consistency check

Run through ALL editor components and verify:

1. No remaining `bg-neutral-*` classes (should all be CSS variables now)
2. All text uses `var(--text-*)` tokens
3. All borders use `var(--border*)` tokens
4. All interactive elements have hover states
5. All buttons have `title` attributes
6. No console.log statements left from debugging
7. No `// TODO` comments that should have been resolved

```bash
# Check for remaining hardcoded colors:
grep -rn "bg-neutral-\|border-neutral-\|text-neutral-" src/components/editor/ | grep -v node_modules | head -20

# Check for debug logs:
grep -rn "console.log" src/components/editor/ | grep -v node_modules | head -20

# Check for unresolved TODOs:
grep -rn "TODO\|FIXME\|HACK\|XXX" src/components/editor/ | head -20
```

Fix anything found.

---

## Final Verification

```bash
npx tsc --noEmit && echo "TS PASS" || echo "TS FAIL"
npm run lint && echo "LINT PASS" || echo "LINT FAIL"
npm run build && echo "BUILD PASS" || echo "BUILD FAIL"
```

## Update PROGRESS.md

```markdown
### Day 6 — Final Polish — YYYY-MM-DD
- [x] Keyboard shortcuts modal with ? key trigger and help button
- [x] First-time onboarding hints (3-step walkthrough)
- [x] Tooltips on all toolbar buttons with shortcut labels
- [x] AI typing indicator (bouncing dots) in chat
- [x] Escape key: clears mesh highlight first, then object selection
- [x] Micro-animations: fade-in, slide-in-from-bottom, smooth transitions
- [x] Generation overlay: progress-based messages ("Creating geometry...", "Applying textures...")
- [x] Consistency check: all hardcoded colors → CSS variables, debug logs removed
```

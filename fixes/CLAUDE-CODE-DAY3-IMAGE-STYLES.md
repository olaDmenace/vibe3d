# Vibe3D — DAY 3: Image-to-3D UI + Generation Style Selector

The image-to-3D backend is already wired (handleImageUpload in chat-panel.tsx, generateFromImage in Meshy provider). This day is about making it prominent and adding a style selector for text-to-3D.

Apply ALL sections.

---

## Section 1: Prominent image upload button in the chat

**File:** `src/components/editor/chat/chat-panel.tsx`

The image upload currently exists but may not be visually prominent. Make it a first-class feature next to the text input.

### A. Add a visible upload button next to the send button

In the chat input area, add a camera/image icon button:

```tsx
<div className="flex items-center gap-2">
  {/* Image upload button */}
  <label className="p-2 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-bg)] transition-colors cursor-pointer" title="Upload image for 3D generation">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
    <input
      type="file"
      accept="image/png,image/jpeg,image/webp"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleImageUpload(file);
        e.target.value = ""; // Reset for re-upload
      }}
    />
  </label>

  {/* Send button */}
  <button type="submit" ...>
    {/* send icon */}
  </button>
</div>
```

### B. Image preview before generation

When a user selects an image, show a preview card in the chat before generation starts:

```tsx
{imagePreview && (
  <div className="mx-4 mb-3 relative inline-block">
    <img
      src={imagePreview}
      alt="Upload preview"
      className="max-h-32 rounded-lg border border-[var(--border)] object-cover"
    />
    <button
      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] flex items-center justify-center text-xs"
      onClick={() => {
        setImagePreview(null);
        // Cancel if not yet started
      }}
    >
      ✕
    </button>
  </div>
)}
```

### C. Drag-and-drop support

Add drag-and-drop to the chat panel area:

```tsx
const [isDragOver, setIsDragOver] = useState(false);

// On the chat panel container:
<div
  className={`relative ${isDragOver ? "ring-2 ring-indigo-500/50 ring-inset" : ""}`}
  onDragOver={(e) => {
    e.preventDefault();
    setIsDragOver(true);
  }}
  onDragLeave={() => setIsDragOver(false)}
  onDrop={(e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file);
    }
  }}
>
  {isDragOver && (
    <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center z-10 pointer-events-none rounded-lg">
      <div className="text-sm text-indigo-400 font-medium">
        Drop image to generate 3D model
      </div>
    </div>
  )}
  {/* ... rest of chat panel ... */}
</div>
```

**Verify:**
```bash
npx tsc --noEmit
grep -n "handleImageUpload\|isDragOver\|imagePreview" src/components/editor/chat/chat-panel.tsx
```

---

## Section 2: Generation style selector

**File:** `src/components/editor/chat/chat-panel.tsx`

Add a style picker that lets users choose the art style BEFORE generating. This changes the `art_style` parameter sent to Meshy.

### A. Style options bar above the chat input

```tsx
const GENERATION_STYLES = [
  { id: "realistic", label: "Realistic", icon: "🎯" },
  { id: "cartoon", label: "Cartoon", icon: "🎨" },
  { id: "low-poly", label: "Low Poly", icon: "💎" },
  { id: "sculpture", label: "Sculpture", icon: "🗿" },
  { id: "pbr", label: "PBR", icon: "✨" },
] as const;

// State:
const [selectedStyle, setSelectedStyle] = useState<string>("realistic");

// Render above the input:
<div className="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--border-subtle)] overflow-x-auto">
  <span className="text-[11px] text-[var(--text-dim)] flex-shrink-0">Style:</span>
  {GENERATION_STYLES.map((style) => (
    <button
      key={style.id}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors flex-shrink-0 ${
        selectedStyle === style.id
          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
          : "text-[var(--text-dim)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-bg)] border border-transparent"
      }`}
      onClick={() => setSelectedStyle(style.id)}
    >
      <span>{style.icon}</span>
      <span>{style.label}</span>
    </button>
  ))}
</div>
```

### B. Pass style to the generate API

When calling the generate endpoint, include the selected style:

```ts
const res = await fetch(`/api/projects/${projectId}/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt,
    style: selectedStyle,  // Pass the selected style
  }),
});
```

The generate route already accepts `style` from the request body and passes it through to the Meshy provider. Verify this is working by checking:

```bash
grep -n "style" src/app/api/projects/*/generate/route.ts
```

**Verify:**
```bash
npx tsc --noEmit
```

---

## Section 3: Generation history in the chat

Show previous generations as visual cards in the chat, not just text:

```tsx
// When showing a generation result message, render it as a card:
function GenerationResultCard({ message }: { message: ChatMessage }) {
  const thumbnailUrl = message.metadata?.thumbnailUrl as string | undefined;
  const meshCount = message.metadata?.meshCount as number | undefined;
  const objectName = message.metadata?.objectName as string | undefined;

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-[var(--card-bg-secondary)] overflow-hidden">
        {thumbnailUrl && (
          <div className="relative">
            <img
              src={thumbnailUrl}
              alt={objectName || "Generated model"}
              className="w-full h-32 object-cover"
            />
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-white">
              3D Model
            </div>
          </div>
        )}
        <div className="px-4 py-2.5">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {objectName || "Generated Model"}
          </p>
          {meshCount && meshCount > 1 && (
            <p className="text-xs text-[var(--text-dim)] mt-0.5">
              {meshCount} editable parts
            </p>
          )}
          <p className="text-xs text-[var(--text-dim)] mt-1">
            Added to scene
          </p>
        </div>
      </div>
    </div>
  );
}
```

To use this, when a generation completes and you push the success message, include metadata:

```ts
setMessages((prev) => [
  ...prev,
  {
    role: "assistant",
    content: statusMessage,
    timestamp: new Date().toISOString(),
    metadata: {
      type: "generation_complete",
      thumbnailUrl: data.thumbnailUrl,
      meshCount: data.meshCount,
      objectName: cleanedName,
    },
  },
]);
```

Then in the message rendering loop, check for `message.metadata?.type === "generation_complete"` and render the card instead of plain text.

You may need to extend your ChatMessage type to include an optional `metadata` field:

```ts
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
```

**Verify:**
```bash
npx tsc --noEmit
```

---

## Section 4: "What would you like to create?" prompt suggestions

When the chat is empty (no messages), show suggestion chips to help users get started:

```tsx
const SUGGESTIONS = [
  "Create a sports car",
  "Create a medieval castle",
  "Create a cute robot",
  "Create a modern chair",
  "Create a treasure chest",
  "Create a space helmet",
];

// Show when messages.length === 0:
{messages.length === 0 && (
  <div className="flex-1 flex flex-col items-center justify-center px-4">
    <p className="text-sm text-[var(--text-dim)] mb-4">Try one of these:</p>
    <div className="flex flex-wrap gap-2 justify-center max-w-sm">
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          className="px-3 py-1.5 rounded-full text-xs border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-bg)] transition-colors"
          onClick={() => {
            // Set the input value and auto-submit
            setInput(s);
          }}
        >
          {s}
        </button>
      ))}
    </div>
  </div>
)}
```

**Verify:**
```bash
npx tsc --noEmit
npm run build
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
### Day 3 — Image-to-3D + Styles — YYYY-MM-DD
- [x] Prominent image upload button with camera icon in chat input
- [x] Image preview card before generation starts
- [x] Drag-and-drop image support on chat panel
- [x] Generation style selector (Realistic, Cartoon, Low Poly, Sculpture, PBR)
- [x] Generation result cards with thumbnail preview in chat
- [x] Prompt suggestion chips for empty chat state
```

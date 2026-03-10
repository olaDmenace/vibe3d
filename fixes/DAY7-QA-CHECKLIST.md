# Vibe3D — DAY 7: QA Testing Checklist + Demo Prep

Day 7 is manual testing. NO new features. Fix bugs found, record a demo.

---

## QA Testing Checklist

Run through every item. Mark PASS/FAIL. Fix any FAIL immediately.

### Auth & Navigation
- [ ] Landing page loads, all links work
- [ ] Sign-in with Google OAuth works
- [ ] Sign-in with email works
- [ ] Onboarding flow completes
- [ ] Dashboard loads with correct projects
- [ ] Create new project → redirects to editor
- [ ] Back button from editor → returns to dashboard

### Editor — Basic
- [ ] Empty state overlay shows on new project
- [ ] "Add a Cube" button works from empty state
- [ ] "Use AI Chat" button focuses the chat input
- [ ] + button shows primitives dropdown (Cube, Sphere, Plane, Cylinder, Cone, Torus)
- [ ] Each primitive type adds correctly and renders
- [ ] New objects spawn offset from existing (not at 0,0,0)
- [ ] Objects appear in scene hierarchy (left sidebar)
- [ ] Click object in viewport → selects it (blue wireframe)
- [ ] Click object in hierarchy → selects it
- [ ] Click empty space → deselects

### Editor — Transform
- [ ] Translate gizmo (G key) moves object
- [ ] Rotate gizmo (R key) rotates object
- [ ] Scale gizmo (S key) scales object
- [ ] Transform values update in right sidebar during drag
- [ ] Manual value entry in sidebar updates object position
- [ ] Snap-to-grid toggle works (objects snap when moving)

### Editor — Materials
- [ ] Color picker changes object color
- [ ] Roughness slider visually changes surface
- [ ] Metalness slider visually changes surface
- [ ] Opacity slider makes object transparent
- [ ] Material presets: click Chrome → object becomes chrome
- [ ] Material presets: click Glass → object becomes transparent
- [ ] Material presets: click Wood → object becomes brown/rough
- [ ] "Reset to original" clears overrides

### Editor — Selection & Hierarchy
- [ ] Double-click hierarchy item → inline rename
- [ ] Right-click hierarchy item → context menu (Rename, Duplicate, Hide, Delete)
- [ ] Delete from context menu works
- [ ] Duplicate from context menu works
- [ ] Hide/Show from context menu works
- [ ] Shift-click for multi-select in hierarchy
- [ ] Delete key deletes selected object(s)
- [ ] Ctrl+D duplicates selected object
- [ ] Ctrl+Z undoes last action
- [ ] Ctrl+Shift+Z redoes
- [ ] Undo/Redo toolbar buttons work and disable when stack empty

### Editor — AI Chat
- [ ] Type "Create a teddy bear" → triggers generation (NOT editing)
- [ ] Type "make it red" with object selected → changes color (NOT new generation)
- [ ] Type "change the color to blue" → edits existing object
- [ ] Type "delete the cube" → removes cube from scene
- [ ] Type "scale it up 2x" → scales selected object
- [ ] Generation progress shows in overlay with spinner
- [ ] Generation completes and model appears in scene
- [ ] Model has segmented parts (6-12 max)
- [ ] Chat success message shows truncated part list
- [ ] Style selector (Realistic, Cartoon, etc.) is visible and functional
- [ ] Suggestion chips show when chat is empty

### Editor — Image-to-3D
- [ ] Image upload button visible in chat
- [ ] Clicking upload → file picker opens
- [ ] Selecting an image → shows preview
- [ ] Image generates 3D model
- [ ] Drag-and-drop image onto chat works

### Editor — Scene Builder
- [ ] Type "Create a desk setup" → scene decomposition triggers
- [ ] AI plans multiple objects (shown in chat)
- [ ] Objects generate sequentially
- [ ] Scene overlay shows per-object progress
- [ ] All objects placed at planned positions (not stacked)
- [ ] Scene template buttons visible in empty chat

### Editor — Parts
- [ ] Generated model shows Parts panel in right sidebar
- [ ] Clicking a part → amber highlight in viewport
- [ ] Hovering a part in hierarchy → highlight flashes
- [ ] Color swatch on each part → opens color picker
- [ ] Changing part color only affects that mesh
- [ ] Expand model in hierarchy → shows mesh children

### Editor — Lighting
- [ ] HDRI environment selector shows presets
- [ ] Changing preset visually updates lighting
- [ ] Ambient light color picker works
- [ ] Ambient light intensity slider works
- [ ] Directional light intensity slider works
- [ ] Directional light height/angle sliders work
- [ ] Shadow toggle works
- [ ] Contact shadows visible on ground plane

### Editor — Camera
- [ ] Orbit (left drag) works
- [ ] Zoom (scroll) works
- [ ] Pan (middle drag) works
- [ ] Home key resets camera
- [ ] F key zooms to fit all objects
- [ ] Camera control buttons in toolbar work

### Editor — Export
- [ ] Export .glb button opens dropdown
- [ ] "Export Scene (.glb)" downloads a file
- [ ] "Export Scene (.obj)" downloads a file
- [ ] "Export Scene (.stl)" downloads a file
- [ ] "Export Selected (.glb)" works when object selected
- [ ] Downloaded .glb opens in https://gltf-viewer.donmccurdy.com/

### Editor — Save
- [ ] Auto-save triggers after editing (amber dot → "Saving...")
- [ ] Save completes (green dot → "Saved just now")
- [ ] Refresh page → scene reloads with all objects
- [ ] Close and reopen project → scene preserved

### Editor — Polish
- [ ] Keyboard shortcuts modal opens with ? key
- [ ] All toolbar buttons have hover tooltips
- [ ] Onboarding hints appear on first load
- [ ] Error boundary: if you break something, it shows "Try Again" not a white screen
- [ ] Loading skeletons on dashboard while projects load
- [ ] Editor skeleton shows while scene data loads
- [ ] No console errors in browser DevTools
- [ ] HD Rendering toggle (if implemented) doesn't break viewport

### Performance
- [ ] Scene with 5+ objects maintains smooth framerate
- [ ] No visible memory leaks (monitor in DevTools → Performance)
- [ ] Page doesn't freeze during generation

---

## Bug Fix Process

For each FAIL:
1. Open Claude Code
2. Describe the exact issue (what you did, what happened, what should have happened)
3. Fix it
4. Re-test that specific item
5. Verify no regressions (tsc + build)

---

## Demo Video Script (3 minutes)

Record a screen recording showing:

**0:00 - 0:15** — Dashboard, create new project
**0:15 - 0:30** — Empty state, click "Add a Cube"
**0:30 - 0:45** — Change cube material to Chrome (material preset)
**0:45 - 1:15** — Type "Create a sports car" → show generation
**1:15 - 1:30** — Model appears, show parts panel, click a part
**1:30 - 1:45** — Color a specific part via the swatch
**1:45 - 2:00** — Type "make the body red" → AI edits the model
**2:00 - 2:15** — Upload an image → image-to-3D generation
**2:15 - 2:30** — Scene template: click "Desk Setup" → multi-object generation
**2:30 - 2:45** — Switch HDRI preset, adjust lighting
**2:45 - 3:00** — Export .glb, show file downloaded

Tools for recording:
- OBS Studio (free)
- Loom (quick share)
- macOS: Cmd+Shift+5

---

## Launch Prep

- [ ] Deploy to Vercel (or your hosting)
- [ ] Test on the deployed URL
- [ ] Set up MESHY_API_KEY in production environment
- [ ] Set up ANTHROPIC_API_KEY in production environment
- [ ] Verify Supabase production database has all tables
- [ ] Test auth flow on production
- [ ] Record demo video
- [ ] Write launch post (optional)

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { EditorAction } from "@/types/actions";
import { TRANSIENT_ACTIONS } from "@/types/actions";
import type { SceneState } from "@/types/scene";

// ============================================================
// DEFAULT SCENE STATE
// ============================================================

export const DEFAULT_SCENE_STATE: SceneState = {
  version: 1,
  objects: {},
  lighting: {
    ambientLight: { color: "#ffffff", intensity: 0.5 },
    directionalLights: [
      {
        id: "default-dir-light",
        color: "#ffffff",
        intensity: 1,
        position: [5, 10, 5],
        castShadow: true,
      },
    ],
    pointLights: [],
  },
  camera: {
    position: [5, 5, 5],
    target: [0, 0, 0],
    fov: 50,
    near: 0.1,
    far: 1000,
  },
  environment: {
    backgroundColor: "#1a1a2e",
    showGrid: true,
    gridSize: 20,
  },
};

// ============================================================
// STORE TYPES
// ============================================================

export type ActiveTool = "select" | "translate" | "rotate" | "scale";
export type SidebarTab = "hierarchy" | "properties" | "assets";

/** A command-based undo entry storing the forward and backward actions */
type UndoEntry = {
  forward: EditorAction;
  backward: EditorAction;
};

type EditorStore = {
  // Scene state
  scene: SceneState;

  // Selection
  selectedObjectId: string | null;
  multiSelectedIds: string[];

  // Undo/Redo (command-based)
  past: UndoEntry[];
  future: UndoEntry[];
  maxHistorySize: number;

  // UI State
  activeTool: ActiveTool;
  sidebarTab: SidebarTab;
  highlightedMeshName: string | null;

  // Actions
  dispatch: (action: EditorAction) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Serialization
  getSerializableState: () => SceneState;
  loadScene: (state: SceneState) => void;

  // UI actions
  setActiveTool: (tool: ActiveTool) => void;
  setSidebarTab: (tab: SidebarTab) => void;
};

// ============================================================
// COMPUTE INVERSE ACTION
// ============================================================

/**
 * Compute the inverse action needed to undo a given action.
 * Must be called BEFORE the action is applied (needs current state).
 */
function computeInverseAction(
  scene: SceneState,
  selectedObjectId: string | null,
  multiSelectedIds: string[],
  action: EditorAction
): EditorAction | null {
  switch (action.type) {
    case "ADD_OBJECT":
      return { type: "DELETE_OBJECT", id: action.id };

    case "DELETE_OBJECT": {
      const obj = scene.objects[action.id];
      if (!obj) return null;
      // Snapshot the object so we can re-add it on undo
      const snapshot = structuredClone(obj);
      const { id, ...payload } = snapshot;
      return { type: "ADD_OBJECT", id, payload };
    }

    case "DUPLICATE_OBJECT":
      return { type: "DELETE_OBJECT", id: action.newId };

    case "TRANSFORM_OBJECT": {
      const obj = scene.objects[action.id];
      if (!obj) return null;
      return {
        type: "TRANSFORM_OBJECT",
        id: action.id,
        transform: structuredClone(obj.transform),
      };
    }

    case "UPDATE_MATERIAL": {
      const obj = scene.objects[action.id];
      if (!obj) return null;
      return {
        type: "UPDATE_MATERIAL",
        id: action.id,
        overrides: structuredClone(obj.materialOverrides),
      };
    }

    case "RENAME_OBJECT": {
      const obj = scene.objects[action.id];
      if (!obj) return null;
      return { type: "RENAME_OBJECT", id: action.id, name: obj.name };
    }

    case "SET_VISIBILITY": {
      const obj = scene.objects[action.id];
      if (!obj) return null;
      return { type: "SET_VISIBILITY", id: action.id, visible: obj.visible };
    }

    case "SET_LOCKED": {
      const obj = scene.objects[action.id];
      if (!obj) return null;
      return { type: "SET_LOCKED", id: action.id, locked: obj.locked };
    }

    case "REPARENT_OBJECT": {
      const obj = scene.objects[action.id];
      if (!obj) return null;
      return {
        type: "REPARENT_OBJECT",
        id: action.id,
        newParentId: obj.parentId,
      };
    }

    case "UPDATE_LIGHTING":
      return {
        type: "UPDATE_LIGHTING",
        lighting: structuredClone(scene.lighting),
      };

    case "UPDATE_ENVIRONMENT":
      return {
        type: "UPDATE_ENVIRONMENT",
        environment: structuredClone(scene.environment),
      };

    case "BATCH_ACTIONS": {
      // Compute inverse for each sub-action, then reverse the order
      const inverses: EditorAction[] = [];
      // We need to compute inverses in forward order (each inverse computed
      // against the state BEFORE that sub-action applies), but for undo
      // we apply them in reverse order.
      let tempScene = structuredClone(scene);
      for (const subAction of action.actions) {
        const inv = computeInverseAction(
          tempScene,
          selectedObjectId,
          multiSelectedIds,
          subAction
        );
        if (inv) inverses.push(inv);
        // Apply the sub-action to tempScene so the next inverse sees the right state
        const tempState = {
          scene: tempScene,
          selectedObjectId,
          multiSelectedIds: [...multiSelectedIds],
        };
        applyAction(tempState, subAction);
        tempScene = tempState.scene;
      }
      inverses.reverse();
      return { type: "BATCH_ACTIONS", actions: inverses };
    }

    default:
      return null;
  }
}

// ============================================================
// REDUCER
// ============================================================

function applyAction(
  state: {
    scene: SceneState;
    selectedObjectId: string | null;
    multiSelectedIds: string[];
  },
  action: EditorAction
): void {
  switch (action.type) {
    case "ADD_OBJECT":
      state.scene.objects[action.id] = { ...action.payload, id: action.id };
      break;

    case "DELETE_OBJECT":
      delete state.scene.objects[action.id];
      if (state.selectedObjectId === action.id) {
        state.selectedObjectId = null;
      }
      state.multiSelectedIds = state.multiSelectedIds.filter(
        (id) => id !== action.id
      );
      break;

    case "DUPLICATE_OBJECT": {
      const source = state.scene.objects[action.sourceId];
      if (source) {
        state.scene.objects[action.newId] = {
          ...structuredClone(source),
          id: action.newId,
          name: `${source.name} (copy)`,
        };
      }
      break;
    }

    case "SELECT_OBJECT":
      state.selectedObjectId = action.id;
      state.multiSelectedIds = action.id ? [action.id] : [];
      break;

    case "MULTI_SELECT":
      state.multiSelectedIds = action.ids;
      state.selectedObjectId = action.ids[0] ?? null;
      break;

    case "TRANSFORM_OBJECT": {
      const obj = state.scene.objects[action.id];
      if (obj) {
        if (action.transform.position)
          obj.transform.position = action.transform.position;
        if (action.transform.rotation)
          obj.transform.rotation = action.transform.rotation;
        if (action.transform.scale)
          obj.transform.scale = action.transform.scale;
      }
      break;
    }

    case "UPDATE_MATERIAL": {
      const obj = state.scene.objects[action.id];
      if (obj) {
        // For undo (where we restore the full overrides array), replace entirely
        // For forward (where AI/user provides partial updates), merge
        // Detect: if this came from an undo, it has the full previous state
        // We merge by materialIndex + meshName as before
        const existing = obj.materialOverrides;
        for (const incoming of action.overrides) {
          let idx = incoming.meshName
            ? existing.findIndex((e) => e.meshName === incoming.meshName)
            : -1;
          if (idx < 0) {
            idx = existing.findIndex(
              (e) => e.materialIndex === incoming.materialIndex && !e.meshName
            );
          }
          if (idx >= 0) {
            Object.assign(existing[idx], incoming);
          } else {
            existing.push(incoming);
          }
        }
      }
      break;
    }

    case "RENAME_OBJECT": {
      const obj = state.scene.objects[action.id];
      if (obj) {
        obj.name = action.name;
      }
      break;
    }

    case "SET_VISIBILITY": {
      const obj = state.scene.objects[action.id];
      if (obj) {
        obj.visible = action.visible;
      }
      break;
    }

    case "SET_LOCKED": {
      const obj = state.scene.objects[action.id];
      if (obj) {
        obj.locked = action.locked;
      }
      break;
    }

    case "REPARENT_OBJECT": {
      const obj = state.scene.objects[action.id];
      if (obj) {
        obj.parentId = action.newParentId;
      }
      break;
    }

    case "UPDATE_LIGHTING":
      Object.assign(state.scene.lighting, action.lighting);
      break;

    case "UPDATE_CAMERA":
      Object.assign(state.scene.camera, action.camera);
      break;

    case "UPDATE_ENVIRONMENT":
      Object.assign(state.scene.environment, action.environment);
      break;

    case "BATCH_ACTIONS":
      for (const subAction of action.actions) {
        applyAction(state, subAction);
      }
      break;
  }
}

// ============================================================
// STORE
// ============================================================

export const useEditorStore = create<EditorStore>()(
  immer((set, get) => ({
    scene: structuredClone(DEFAULT_SCENE_STATE),

    selectedObjectId: null,
    multiSelectedIds: [],

    past: [],
    future: [],
    maxHistorySize: 30, // Keep history compact to limit memory usage; command-based entries are lightweight but scene snapshots in inverse actions can grow

    activeTool: "select",
    sidebarTab: "hierarchy",
    highlightedMeshName: null,

    dispatch: (action: EditorAction) => {
      if (!TRANSIENT_ACTIONS.includes(action.type)) {
        // Compute inverse BEFORE applying (needs current state, not immer proxy)
        const currentState = get();
        const inverse = computeInverseAction(
          // Use a plain snapshot for inverse computation to avoid proxy issues
          structuredClone(currentState.scene),
          currentState.selectedObjectId,
          currentState.multiSelectedIds,
          action
        );

        set((state) => {
          if (inverse) {
            state.past.push({ forward: action, backward: inverse });
            if (state.past.length > state.maxHistorySize) {
              state.past.shift();
            }
          }
          state.future = [];
          applyAction(state, action);
        });
      } else {
        set((state) => {
          applyAction(state, action);
        });
      }

      // Clear mesh highlight when changing object selection
      if (action.type === "SELECT_OBJECT") {
        set({ highlightedMeshName: null });
      }
    },

    undo: () => {
      set((state) => {
        if (state.past.length === 0) return;
        const entry = state.past.pop()!;
        // Apply backward action directly (no recording)
        applyAction(state, entry.backward);
        state.future.push(entry);
      });
    },

    redo: () => {
      set((state) => {
        if (state.future.length === 0) return;
        const entry = state.future.pop()!;
        // Apply forward action directly (no recording)
        applyAction(state, entry.forward);
        state.past.push(entry);
      });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    getSerializableState: () => structuredClone(get().scene),

    loadScene: (sceneState: SceneState) => {
      set((state) => {
        state.scene = sceneState;
        state.past = [];
        state.future = [];
        state.selectedObjectId = null;
        state.multiSelectedIds = [];
      });
    },

    setActiveTool: (tool) => set({ activeTool: tool }),
    setSidebarTab: (tab) => set({ sidebarTab: tab }),
  }))
);

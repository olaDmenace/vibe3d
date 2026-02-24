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

type EditorStore = {
  // Scene state
  scene: SceneState;

  // Selection
  selectedObjectId: string | null;
  multiSelectedIds: string[];

  // Undo/Redo
  past: SceneState[];
  future: SceneState[];
  maxHistorySize: number;

  // UI State
  activeTool: ActiveTool;
  sidebarTab: SidebarTab;

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
        obj.materialOverrides = action.overrides;
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
    maxHistorySize: 50,

    activeTool: "select",
    sidebarTab: "hierarchy",

    dispatch: (action: EditorAction) => {
      // Snapshot BEFORE entering immer draft (structuredClone can't handle proxies)
      if (!TRANSIENT_ACTIONS.includes(action.type)) {
        const snapshot = structuredClone(get().scene);
        set((state) => {
          state.past.push(snapshot);
          if (state.past.length > state.maxHistorySize) {
            state.past.shift();
          }
          state.future = [];
          applyAction(state, action);
        });
      } else {
        set((state) => {
          applyAction(state, action);
        });
      }
    },

    undo: () => {
      const snapshot = structuredClone(get().scene);
      set((state) => {
        if (state.past.length === 0) return;
        const previous = state.past.pop()!;
        state.future.push(snapshot);
        state.scene = previous;
      });
    },

    redo: () => {
      const snapshot = structuredClone(get().scene);
      set((state) => {
        if (state.future.length === 0) return;
        const next = state.future.pop()!;
        state.past.push(snapshot);
        state.scene = next;
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

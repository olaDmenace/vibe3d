// ============================================================
// EDITOR ACTIONS
// Every state mutation goes through this system.
// This enables undo/redo, AI integration, and serialization.
// ============================================================

import type {
  CameraState,
  EnvironmentConfig,
  LightingConfig,
  MaterialOverride,
  SceneObject,
  Transform,
} from "./scene";

export type EditorAction =
  | { type: "ADD_OBJECT"; payload: Omit<SceneObject, "id">; id: string }
  | { type: "DELETE_OBJECT"; id: string }
  | { type: "DUPLICATE_OBJECT"; sourceId: string; newId: string }
  | { type: "SELECT_OBJECT"; id: string | null }
  | { type: "MULTI_SELECT"; ids: string[] }
  | { type: "TRANSFORM_OBJECT"; id: string; transform: Partial<Transform> }
  | { type: "UPDATE_MATERIAL"; id: string; overrides: MaterialOverride[] }
  | { type: "RENAME_OBJECT"; id: string; name: string }
  | { type: "SET_VISIBILITY"; id: string; visible: boolean }
  | { type: "SET_LOCKED"; id: string; locked: boolean }
  | { type: "REPARENT_OBJECT"; id: string; newParentId: string | null }
  | { type: "UPDATE_LIGHTING"; lighting: Partial<LightingConfig> }
  | { type: "UPDATE_CAMERA"; camera: Partial<CameraState> }
  | { type: "UPDATE_ENVIRONMENT"; environment: Partial<EnvironmentConfig> }
  | { type: "BATCH_ACTIONS"; actions: EditorAction[] };

/** Actions that should NOT be recorded in undo history */
export const TRANSIENT_ACTIONS: EditorAction["type"][] = [
  "SELECT_OBJECT",
  "MULTI_SELECT",
  "UPDATE_CAMERA",
];

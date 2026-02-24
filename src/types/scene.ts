// ============================================================
// SCENE GRAPH TYPES
// These types define the structure stored in scenes.scene_graph
// ============================================================

/** Root scene state — this is what gets serialized to DB */
export type SceneState = {
  version: number;
  objects: Record<string, SceneObject>;
  lighting: LightingConfig;
  camera: CameraState;
  environment: EnvironmentConfig;
};

/** A single object in the scene */
export type SceneObject = {
  id: string;
  name: string;
  parentId: string | null;
  assetId: string;
  visible: boolean;
  locked: boolean;
  transform: Transform;
  materialOverrides: MaterialOverride[];
  metadata: Record<string, unknown>;
};

export type Transform = {
  position: [number, number, number];
  rotation: [number, number, number]; // euler angles in radians
  scale: [number, number, number];
};

/** Override a specific material on the loaded model */
export type MaterialOverride = {
  materialIndex: number;
  color?: string;
  roughness?: number; // 0-1
  metalness?: number; // 0-1
  opacity?: number; // 0-1
  emissive?: string;
  emissiveIntensity?: number;
  textureAssetId?: string;
};

export type LightingConfig = {
  ambientLight: {
    color: string;
    intensity: number;
  };
  directionalLights: DirectionalLightConfig[];
  pointLights: PointLightConfig[];
};

export type DirectionalLightConfig = {
  id: string;
  color: string;
  intensity: number;
  position: [number, number, number];
  castShadow: boolean;
};

export type PointLightConfig = {
  id: string;
  color: string;
  intensity: number;
  position: [number, number, number];
  distance: number;
  decay: number;
};

export type CameraState = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  near: number;
  far: number;
};

export type EnvironmentConfig = {
  backgroundColor: string;
  hdriAssetId?: string;
  showGrid: boolean;
  gridSize: number;
};

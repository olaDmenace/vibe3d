import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import type { SceneState } from "@/types/scene";

export type ExportFormat = "glb" | "obj" | "stl";

interface ExportOptions {
  watermark?: boolean;
  watermarkText?: string;
}

const PRIMITIVES = new Set(["cube", "sphere", "plane", "cylinder", "cone", "torus"]);

function getPrimitiveType(assetId: string): string {
  if (assetId.startsWith("primitive:")) return assetId.slice("primitive:".length);
  return assetId;
}

function isPrimitive(assetId: string): boolean {
  const type = getPrimitiveType(assetId);
  return PRIMITIVES.has(type);
}

function createPrimitiveGeometry(type: string): THREE.BufferGeometry {
  switch (type) {
    case "sphere":
      return new THREE.SphereGeometry(0.5, 32, 32);
    case "plane":
      return new THREE.PlaneGeometry(1, 1);
    case "cylinder":
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    case "cone":
      return new THREE.ConeGeometry(0.5, 1, 32);
    case "torus":
      return new THREE.TorusGeometry(0.4, 0.15, 16, 32);
    case "cube":
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

/** Create a watermark plane with text rendered via CanvasTexture */
function createWatermarkPlane(text: string): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText(text, 256, 40);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const geometry = new THREE.PlaneGeometry(4, 0.5);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "Vibe3D_Watermark";
  mesh.position.set(0, 0.01, 0);
  mesh.rotation.set(-Math.PI / 2, 0, 0);
  return mesh;
}

/** Load a GLB model from a URL and return the scene */
async function loadGLBFromUrl(url: string): Promise<THREE.Group | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch model: ${url} (${response.status})`);
      return null;
    }
    const buffer = await response.arrayBuffer();

    const loader = new GLTFLoader();
    return new Promise((resolve) => {
      loader.parse(
        buffer,
        "",
        (gltf) => {
          resolve(gltf.scene);
        },
        (error) => {
          console.warn(`Failed to parse GLB model from ${url}:`, error);
          resolve(null);
        }
      );
    });
  } catch (err) {
    console.warn(`Failed to load model from ${url}:`, err);
    return null;
  }
}

/** Build a Three.js scene from the editor store's SceneState */
async function buildScene(
  sceneState: SceneState,
  options?: ExportOptions
): Promise<THREE.Scene> {
  const scene = new THREE.Scene();
  scene.name = "Vibe3D Scene";

  if (options?.watermark) {
    scene.userData.watermark = "Created with Vibe3D Free Tier";
    const watermarkMesh = createWatermarkPlane(
      options.watermarkText || "Created with Vibe3D — Free Tier"
    );
    scene.add(watermarkMesh);
  }

  // Add objects
  const loadPromises: Promise<void>[] = [];

  for (const obj of Object.values(sceneState.objects)) {
    if (!obj.visible) continue;

    if (isPrimitive(obj.assetId)) {
      const type = getPrimitiveType(obj.assetId);
      const geometry = createPrimitiveGeometry(type);
      const mat = obj.materialOverrides[0];
      const material = new THREE.MeshStandardMaterial({
        color: mat?.color ?? "#888888",
        metalness: mat?.metalness ?? 0,
        roughness: mat?.roughness ?? 0.5,
        opacity: mat?.opacity ?? 1,
        transparent: (mat?.opacity ?? 1) < 1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = obj.name;
      mesh.position.set(...obj.transform.position);
      mesh.rotation.set(...obj.transform.rotation);
      mesh.scale.set(...obj.transform.scale);
      scene.add(mesh);
    } else {
      // Non-primitive — try to load from modelUrl
      const modelUrl = (obj.metadata as Record<string, unknown> | undefined)
        ?.modelUrl as string | undefined;
      if (modelUrl) {
        loadPromises.push(
          loadGLBFromUrl(modelUrl).then((group) => {
            if (group) {
              group.name = obj.name;
              group.position.set(...obj.transform.position);
              group.rotation.set(...obj.transform.rotation);
              group.scale.set(...obj.transform.scale);
              scene.add(group);
            }
          })
        );
      } else {
        console.warn(`Skipping object "${obj.name}" — no modelUrl in metadata`);
      }
    }
  }

  await Promise.all(loadPromises);

  // Add lighting
  const ambient = new THREE.AmbientLight(
    sceneState.lighting.ambientLight.color,
    sceneState.lighting.ambientLight.intensity
  );
  scene.add(ambient);

  for (const dl of sceneState.lighting.directionalLights) {
    const light = new THREE.DirectionalLight(dl.color, dl.intensity);
    light.position.set(...dl.position);
    scene.add(light);
  }

  for (const pl of sceneState.lighting.pointLights) {
    const light = new THREE.PointLight(pl.color, pl.intensity, pl.distance, pl.decay);
    light.position.set(...pl.position);
    scene.add(light);
  }

  return scene;
}

/** Dispose all resources in a scene */
function disposeScene(scene: THREE.Scene) {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else if (child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    }
  });
}

/** Export as GLB */
async function exportAsGLB(scene: THREE.Scene): Promise<Blob> {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: "model/gltf-binary" }));
        } else {
          const json = JSON.stringify(result);
          resolve(new Blob([json], { type: "model/gltf+json" }));
        }
      },
      (error) => reject(error),
      { binary: true }
    );
  });
}

/** Export as OBJ */
function exportAsOBJ(scene: THREE.Scene): Blob {
  const exporter = new OBJExporter();
  const result = exporter.parse(scene);
  return new Blob([result], { type: "text/plain" });
}

/** Export as STL */
function exportAsSTL(scene: THREE.Scene): Blob {
  const exporter = new STLExporter();
  const result = exporter.parse(scene, { binary: true });
  return new Blob([result], { type: "application/octet-stream" });
}

/**
 * Main export function — builds scene from store state and exports in the
 * requested format.
 */
export async function exportScene(
  sceneState: SceneState,
  format: ExportFormat = "glb",
  options?: ExportOptions
): Promise<Blob> {
  const scene = await buildScene(sceneState, options);

  try {
    switch (format) {
      case "obj":
        return exportAsOBJ(scene);
      case "stl":
        return exportAsSTL(scene);
      case "glb":
      default:
        return await exportAsGLB(scene);
    }
  } finally {
    disposeScene(scene);
  }
}

/** Backward-compatible alias */
export async function exportSceneFromStore(
  sceneState: SceneState,
  options?: { watermark?: boolean }
): Promise<Blob> {
  return exportScene(sceneState, "glb", options);
}

/** Trigger a file download in the browser. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** File extension for each format */
export function getExtension(format: ExportFormat): string {
  switch (format) {
    case "obj":
      return "obj";
    case "stl":
      return "stl";
    case "glb":
    default:
      return "glb";
  }
}

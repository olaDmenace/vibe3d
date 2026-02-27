import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { SceneState } from "@/types/scene";

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

/**
 * Build a Three.js scene from the editor store's SceneState
 * and export it as a GLB blob. No Canvas required.
 */
export async function exportSceneFromStore(
  sceneState: SceneState,
  options?: { watermark?: boolean }
): Promise<Blob> {
  const scene = new THREE.Scene();
  scene.name = "Vibe3D Scene";

  if (options?.watermark) {
    scene.userData.watermark = "Created with Vibe3D Free Tier";
  }

  // Add objects
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
    }
    // Non-primitive objects (GLBs) are skipped for now in export
    // since they need to be loaded from URLs first
  }

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

  // Export
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

        // Dispose resources
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
        });
      },
      (error) => {
        reject(error);
      },
      { binary: true }
    );
  });
}

/**
 * Trigger a file download in the browser.
 */
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

"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { DEFAULT_SCENE_STATE } from "@/store/editor-store";

declare global {
  interface Window {
    __vibe3d_resetCamera?: () => void;
    __vibe3d_zoomToFit?: () => void;
  }
}

export function CameraManager() {
  const { camera, scene } = useThree();
  // Access the OrbitControls via the default controls
  const controls = useThree(
    (state) => state.controls
  ) as unknown as { target: THREE.Vector3; update: () => void } | null;

  useEffect(() => {
    window.__vibe3d_resetCamera = () => {
      const [px, py, pz] = DEFAULT_SCENE_STATE.camera.position;
      camera.position.set(px, py, pz);
      if (controls) {
        const [tx, ty, tz] = DEFAULT_SCENE_STATE.camera.target;
        controls.target.set(tx, ty, tz);
        controls.update();
      }
    };

    window.__vibe3d_zoomToFit = () => {
      const box = new THREE.Box3();
      let hasObjects = false;

      scene.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.userData?.objectId
        ) {
          box.expandByObject(child);
          hasObjects = true;
        }
        // Also check groups with objectId
        if (
          child.userData?.objectId &&
          !(child instanceof THREE.Mesh)
        ) {
          child.traverse((sub) => {
            if (sub instanceof THREE.Mesh) {
              box.expandByObject(sub);
              hasObjects = true;
            }
          });
        }
      });

      if (!hasObjects) return;

      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov =
        camera instanceof THREE.PerspectiveCamera ? camera.fov : 50;
      const distance = (maxDim / 2 / Math.tan((fov * Math.PI) / 360)) * 1.5;

      camera.position.set(
        center.x + distance * 0.6,
        center.y + distance * 0.4,
        center.z + distance * 0.6
      );

      if (controls) {
        controls.target.copy(center);
        controls.update();
      }
    };

    return () => {
      delete window.__vibe3d_resetCamera;
      delete window.__vibe3d_zoomToFit;
    };
  }, [camera, scene, controls]);

  return null;
}

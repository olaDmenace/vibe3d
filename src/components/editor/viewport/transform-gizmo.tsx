"use client";

import { useEditorStore } from "@/store/editor-store";
import { TransformControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * TransformControls gizmo for the currently selected object.
 * Dispatches TRANSFORM_OBJECT on drag end.
 */
export function TransformGizmo() {
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const objects = useEditorStore((s) => s.scene.objects);
  const activeTool = useEditorStore((s) => s.activeTool);
  const dispatch = useEditorStore((s) => s.dispatch);
  const { scene } = useThree();
  const controlsRef = useRef<React.ComponentRef<typeof TransformControls>>(null);

  const selectedObject = selectedObjectId
    ? objects[selectedObjectId]
    : null;

  // Find the Three.js group matching the selected object
  const targetRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    if (!selectedObjectId) {
      targetRef.current = null;
      return;
    }

    // Find the group in the scene with matching userData
    scene.traverse((child) => {
      if (child.userData?.objectId === selectedObjectId) {
        targetRef.current = child;
      }
    });
  }, [selectedObjectId, scene, objects]);

  if (!selectedObject || !selectedObjectId || activeTool === "select") {
    return null;
  }

  const mode =
    activeTool === "translate"
      ? "translate"
      : activeTool === "rotate"
        ? "rotate"
        : "scale";

  return (
    <>
      {targetRef.current && (
        <TransformControls
          ref={controlsRef}
          object={targetRef.current}
          mode={mode}
          onMouseUp={() => {
            if (!targetRef.current || !selectedObjectId) return;

            const pos = targetRef.current.position;
            const rot = targetRef.current.rotation;
            const scl = targetRef.current.scale;

            dispatch({
              type: "TRANSFORM_OBJECT",
              id: selectedObjectId,
              transform: {
                position: [pos.x, pos.y, pos.z],
                rotation: [rot.x, rot.y, rot.z],
                scale: [scl.x, scl.y, scl.z],
              },
            });
          }}
        />
      )}
    </>
  );
}

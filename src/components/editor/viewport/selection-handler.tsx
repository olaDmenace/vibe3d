"use client";

import * as THREE from "three";
import { useEditorStore } from "@/store/editor-store";
import { ThreeEvent } from "@react-three/fiber";
import { useCallback } from "react";

/**
 * Invisible plane that catches clicks on empty space to deselect.
 * Object clicks are handled via the scene renderer meshes.
 */
export function SelectionHandler() {
  const dispatch = useEditorStore((s) => s.dispatch);

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      // Walk up the parent chain to find the object ID
      let current = e.object as THREE.Object3D | null;
      while (current) {
        if (current.userData?.objectId) {
          e.stopPropagation();
          dispatch({ type: "SELECT_OBJECT", id: current.userData.objectId });
          return;
        }
        current = current.parent;
      }
    },
    [dispatch]
  );

  const handleMissed = useCallback(() => {
    dispatch({ type: "SELECT_OBJECT", id: null });
  }, [dispatch]);

  return (
    <group onPointerDown={handlePointerDown} onPointerMissed={handleMissed} />
  );
}

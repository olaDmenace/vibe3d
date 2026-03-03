"use client";

import { useState } from "react";
import { useEditorStore } from "@/store/editor-store";
import type { SceneObject } from "@/types/scene";

interface MeshPartsPanelProps {
  object: SceneObject;
}

/** Clean up mesh names for display: underscores → spaces, title case */
function formatMeshName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function MeshPartsPanel({ object }: MeshPartsPanelProps) {
  const meshNames = (object.metadata?.meshNames as string[]) ?? [];
  const dispatch = useEditorStore((s) => s.dispatch);
  const highlightedMeshName = useEditorStore((s) => s.highlightedMeshName);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  if (meshNames.length < 2) return null;

  function getPartColor(meshName: string): string | null {
    const override = object.materialOverrides.find(
      (o) => o.meshName === meshName
    );
    return override?.color ?? null;
  }

  function setPartColor(meshName: string, color: string) {
    dispatch({
      type: "UPDATE_MATERIAL",
      id: object.id,
      overrides: [{ materialIndex: 0, meshName, color }],
    });
  }

  function clearPartColor(meshName: string) {
    // Dispatch with the full overrides minus this mesh's override
    const remaining = object.materialOverrides.filter(
      (o) => o.meshName !== meshName
    );
    // We need to replace the entire array — use a trick: dispatch a
    // batch that clears then restores the remaining overrides
    dispatch({
      type: "UPDATE_MATERIAL",
      id: object.id,
      overrides: remaining.length > 0 ? remaining : [{ materialIndex: 0 }],
    });
  }

  function selectPart(meshName: string | null) {
    useEditorStore.setState({ highlightedMeshName: meshName });
  }

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="font-[family-name:var(--font-spline-sans)] text-[11px] font-semibold tracking-[0.3px] text-white/[0.95]">
          Parts ({meshNames.length})
        </span>
      </div>
      <div className="flex flex-col gap-0.5 px-3 pb-2">
        {meshNames.map((name) => {
          const color = getPartColor(name);
          const isSelected = highlightedMeshName === name;
          const isHovered = hoveredPart === name;
          const displayName = formatMeshName(name);

          return (
            <div
              key={name}
              className="flex h-7 items-center gap-2 rounded-[8px] px-2 cursor-pointer transition-colors"
              style={{
                background: isSelected
                  ? "rgba(245, 158, 11, 0.15)"
                  : isHovered
                    ? "rgba(255, 255, 255, 0.06)"
                    : "rgba(255, 255, 255, 0.03)",
                border: isSelected
                  ? "1px solid rgba(245, 158, 11, 0.3)"
                  : "1px solid transparent",
              }}
              onClick={() => selectPart(isSelected ? null : name)}
              onMouseEnter={() => {
                setHoveredPart(name);
                useEditorStore.setState({ highlightedMeshName: name });
              }}
              onMouseLeave={() => {
                setHoveredPart(null);
                if (!isSelected) {
                  useEditorStore.setState({ highlightedMeshName: null });
                }
              }}
            >
              {/* Color swatch / picker */}
              <label className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <div
                  className="w-4 h-4 rounded border border-neutral-600 cursor-pointer"
                  style={{ backgroundColor: color || "#888888" }}
                />
                <input
                  type="color"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={color || "#888888"}
                  onChange={(e) => setPartColor(name, e.target.value)}
                />
              </label>

              {/* Part name */}
              <span className="truncate flex-1 font-[family-name:var(--font-spline-sans)] text-[11px] text-white/70">
                {displayName}
              </span>

              {/* Clear button (only shown if color override exists) */}
              {color && (
                <button
                  className="text-neutral-500 hover:text-neutral-300 text-[10px] flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearPartColor(name);
                  }}
                  title="Reset to original"
                >
                  x
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

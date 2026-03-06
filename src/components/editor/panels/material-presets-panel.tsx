"use client";

import { useState } from "react";
import { useEditorStore } from "@/store/editor-store";
import { MATERIAL_PRESETS, MATERIAL_CATEGORIES, type MaterialPreset } from "@/lib/material-presets";
import type { MaterialOverride } from "@/types/scene";

export function MaterialPresetsPanel() {
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const selectedObject = useEditorStore((s) =>
    s.selectedObjectId ? s.scene.objects[s.selectedObjectId] : null
  );
  const highlightedMeshName = useEditorStore((s) => s.highlightedMeshName);
  const dispatch = useEditorStore((s) => s.dispatch);
  const [activeCategory, setActiveCategory] = useState<string>("Metal");

  if (!selectedObject || !selectedObjectId) return null;

  function applyPreset(preset: MaterialPreset) {
    if (!selectedObjectId || !selectedObject) return;

    const override: MaterialOverride = {
      materialIndex: 0,
      color: preset.color,
      roughness: preset.roughness,
      metalness: preset.metalness,
      opacity: preset.opacity,
    };

    if (highlightedMeshName) {
      override.meshName = highlightedMeshName;
    }

    if (preset.emissive) {
      override.emissive = preset.emissive;
      override.emissiveIntensity = preset.emissiveIntensity;
    }

    // Keep other overrides, replace the one for this target
    const otherOverrides = selectedObject.materialOverrides.filter((o) => {
      if (highlightedMeshName) return o.meshName !== highlightedMeshName;
      return !!o.meshName;
    });

    dispatch({
      type: "UPDATE_MATERIAL",
      id: selectedObjectId,
      overrides: [...otherOverrides, override],
    });
  }

  const targetLabel = highlightedMeshName
    ? highlightedMeshName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Whole object";

  const filteredPresets = MATERIAL_PRESETS.filter((p) => p.category === activeCategory);

  return (
    <div className="px-3 py-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-spline-sans)] text-[11px] font-medium text-white/[0.92]">
          Material Presets
        </span>
        <span className="font-[family-name:var(--font-spline-sans)] text-[10px] text-white/40 truncate max-w-[100px]">
          {targetLabel}
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {MATERIAL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`px-2 py-0.5 rounded-full text-[10px] flex-shrink-0 transition-colors ${
              activeCategory === cat
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-white/40 hover:text-white/60 border border-transparent"
            }`}
            style={{ fontFamily: "var(--font-spline-sans)" }}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-3 gap-1">
        {filteredPresets.map((preset) => (
          <button
            key={preset.id}
            className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors group"
            onClick={() => applyPreset(preset)}
            title={`Apply ${preset.name}`}
          >
            <div
              className="w-8 h-8 rounded-lg border border-white/[0.1] group-hover:border-white/[0.2] transition-colors shadow-sm"
              style={{ background: preset.thumbnail || preset.color }}
            />
            <span
              className="text-[9px] text-white/40 group-hover:text-white/60 truncate max-w-full transition-colors"
              style={{ fontFamily: "var(--font-spline-sans)" }}
            >
              {preset.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
